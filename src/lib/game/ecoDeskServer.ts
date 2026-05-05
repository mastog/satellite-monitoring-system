import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ECO_ROLES,
  type EcoRole,
  type EnvironmentState,
  type FundingAction,
  type MonitoringAction,
  type PolicyAction,
  type RoundActionBundle,
  parseJson,
  resolveRound,
  roomCode,
  scenarioForRound,
} from "@/lib/game/ecoDesk";

const ROOM_PRESENCE_TIMEOUT_MS = 90_000;

function asEnvironmentState(room: {
  treasury: number;
  publicTrust: number;
  airQuality: number;
  waterSecurity: number;
  biodiversity: number;
  heatRisk: number;
}): EnvironmentState {
  return {
    treasury: room.treasury,
    publicTrust: room.publicTrust,
    airQuality: room.airQuality,
    waterSecurity: room.waterSecurity,
    biodiversity: room.biodiversity,
    heatRisk: room.heatRisk,
  };
}

function presenceCutoff() {
  return new Date(Date.now() - ROOM_PRESENCE_TIMEOUT_MS);
}

// Deletes rooms whose claimed seats have all exceeded the presence timeout.
async function pruneInactiveGameRooms() {
  const cutoff = presenceCutoff();
  const rooms = await prisma.gameRoom.findMany({
    where: { status: { not: "finished" } },
    select: {
      id: true,
      seats: {
        select: { lastSeenAt: true },
      },
    },
  });

  const staleRoomIds = rooms
    .filter(
      (room) =>
        room.seats.length > 0 &&
        room.seats.every((seat) => seat.lastSeenAt < cutoff)
    )
    .map((room) => room.id);

  if (staleRoomIds.length > 0) {
    await prisma.gameRoom.deleteMany({
      where: { id: { in: staleRoomIds } },
    });
  }
}

async function touchRoomSeat(
  tx: Prisma.TransactionClient,
  roomId: string,
  userId: string
) {
  await tx.gameRoomSeat.updateMany({
    where: { roomId, userId },
    data: { lastSeenAt: new Date() },
  });
}

// Refreshes one claimed seat without loading the room state payload.
export async function touchRoomPresence(params: {
  roomId: string;
  userId: string;
}) {
  await pruneInactiveGameRooms();

  const result = await prisma.gameRoomSeat.updateMany({
    where: { roomId: params.roomId, userId: params.userId },
    data: { lastSeenAt: new Date() },
  });

  if (result.count === 0) {
    throw new Error("Seat not found");
  }
}

async function ensureUniqueRoomCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = roomCode();
    const exists = await prisma.gameRoom.findUnique({ where: { code } });
    if (!exists) return code;
  }
  throw new Error("Failed to allocate room code");
}

// Creates a numbered room with the creator bound to the opening role.
export async function createEcoDeskRoom(params: {
  userId: string;
  role: EcoRole;
  userName: string;
}) {
  const code = await ensureUniqueRoomCode();
  return prisma.gameRoom.create({
    data: {
      code,
      title: `Desk ${code}`,
      createdById: params.userId,
      scenarioSeed: Math.floor(Math.random() * 10_000),
      seats: {
        create: {
          userId: params.userId,
          role: params.role,
          ready: false,
        },
      },
      messages: {
        create: {
          userId: params.userId,
          userName: params.userName,
          kind: "system",
          body: `${params.userName} opened the operations room as ${params.role.toUpperCase()}.`,
        },
      },
    },
  });
}

// Lists active rooms together with any never-claimed roles.
export async function listActiveGameRooms(userId: string) {
  await pruneInactiveGameRooms();

  const rooms = await prisma.gameRoom.findMany({
    where: { status: { not: "finished" } },
    orderBy: { updatedAt: "desc" },
    take: 18,
    include: {
      seats: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rooms.map((room) => {
    const userSeat = room.seats.find((seat) => seat.userId === userId);
    return {
      id: room.id,
      code: room.code,
      title: room.title,
      status: room.status,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      role: userSeat?.role ?? null,
      ready: userSeat?.ready ?? false,
      availableRoles: ECO_ROLES.filter(
        (role) => !room.seats.some((seat) => seat.role === role)
      ),
      seats: room.seats.map((seat) => ({
        role: seat.role,
        ready: seat.ready,
        userName: seat.user.name,
      })),
      updatedAt: room.updatedAt.toISOString(),
    };
  });
}

// Claims one unbound role seat or reopens the player's existing seat.
export async function joinEcoDeskRoom(params: {
  roomId: string;
  userId: string;
  role: EcoRole;
  userName: string;
}) {
  await pruneInactiveGameRooms();

  return prisma.$transaction(async (tx) => {
    const room = await tx.gameRoom.findUnique({
      where: { id: params.roomId },
      include: { seats: true },
    });
    if (!room) throw new Error("Room not found");
    if (room.status === "finished") throw new Error("Room already closed");

    const existingSeat = room.seats.find((seat) => seat.userId === params.userId);
    const occupiedSeat = room.seats.find(
      (seat) => seat.role === params.role && seat.userId !== params.userId
    );
    if (occupiedSeat) {
      throw new Error("Role already occupied");
    }

    if (existingSeat) {
      if (existingSeat.role !== params.role) {
        throw new Error("Role already locked for this room");
      }

      await tx.gameRoomSeat.update({
        where: { id: existingSeat.id },
        data: {
          ready: room.status === "active",
          lastSeenAt: new Date(),
        },
      });

      return room;
    }

    await tx.gameRoomSeat.create({
      data: {
        roomId: room.id,
        userId: params.userId,
        role: params.role,
        ready: room.status === "active",
        lastSeenAt: new Date(),
      },
    });

    await tx.gameRoomMessage.create({
      data: {
        roomId: room.id,
        userId: params.userId,
        userName: params.userName,
        kind: "system",
        body: `${params.userName} joined as ${params.role.toUpperCase()}.`,
      },
    });

    return room;
  });
}

// Updates seat readiness and starts the first round when all roles are locked.
export async function setSeatReady(params: {
  roomId: string;
  userId: string;
  ready: boolean;
  userName: string;
}) {
  return prisma.$transaction(async (tx) => {
    const seat = await tx.gameRoomSeat.findFirst({
      where: { roomId: params.roomId, userId: params.userId },
      include: { room: { include: { seats: true } } },
    });
    if (!seat) throw new Error("Seat not found");

    await tx.gameRoomSeat.update({
      where: { id: seat.id },
      data: { ready: params.ready, lastSeenAt: new Date() },
    });

    const refreshedSeats = seat.room.seats.map((entry) =>
      entry.userId === params.userId ? { ...entry, ready: params.ready } : entry
    );

    const shouldStart =
      seat.room.status === "waiting" &&
      refreshedSeats.length === ECO_ROLES.length &&
      refreshedSeats.every((entry) => entry.ready);

    await tx.gameRoomMessage.create({
      data: {
        roomId: params.roomId,
        userId: params.userId,
        userName: params.userName,
        kind: "system",
        body: params.ready
          ? `${params.userName} locked in for round ${seat.room.currentRound}.`
          : `${params.userName} reopened their seat status.`,
      },
    });

    if (shouldStart) {
      await tx.gameRoom.update({
        where: { id: params.roomId },
        data: {
          status: "active",
          deadlineAt: null,
        },
      });

      await tx.gameRoomMessage.create({
        data: {
          roomId: params.roomId,
          userName: "SYSTEM",
          kind: "system",
          body: "Round 1 has begun. Review the desk and submit your file before the quarter closes.",
        },
      });
    }
  });
}

// Stores the current role file for the active quarter.
export async function submitRoomAction(params: {
  roomId: string;
  userId: string;
  payload: string;
}) {
  return prisma.$transaction(async (tx) => {
    const seat = await tx.gameRoomSeat.findFirst({
      where: { roomId: params.roomId, userId: params.userId },
      include: { room: true, user: { select: { name: true } } },
    });
    if (!seat) throw new Error("Seat not found");
    if (seat.room.status !== "active") throw new Error("Room not active");

    await tx.gameRoomAction.upsert({
      where: {
        roomId_roundNumber_role: {
          roomId: params.roomId,
          roundNumber: seat.room.currentRound,
          role: seat.role,
        },
      },
      update: {
        payload: params.payload,
        userId: params.userId,
        submittedAt: new Date(),
      },
      create: {
        roomId: params.roomId,
        roundNumber: seat.room.currentRound,
        userId: params.userId,
        role: seat.role,
        payload: params.payload,
      },
    });

    await touchRoomSeat(tx, params.roomId, params.userId);

    await tx.gameRoomMessage.create({
      data: {
        roomId: params.roomId,
        userId: params.userId,
        userName: seat.user.name,
        kind: "system",
        body: `${seat.user.name} filed the ${seat.role.toUpperCase()} action for round ${seat.room.currentRound}.`,
      },
    });
  });

  await maybeResolveRoom(params.roomId);
}

// Stores text and voice dispatches in the room ledger.
export async function postRoomMessage(params: {
  roomId: string;
  userId: string;
  userName: string;
  kind: "text" | "voice";
  body: string;
  metadata?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await touchRoomSeat(tx, params.roomId, params.userId);

    return tx.gameRoomMessage.create({
      data: {
        roomId: params.roomId,
        userId: params.userId,
        userName: params.userName,
        kind: params.kind,
        body: params.body,
        metadata: params.metadata ?? "{}",
      },
    });
  });
}

// Resolves the quarter once all three role files have been submitted.
export async function maybeResolveRoom(roomId: string) {
  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: { seats: true },
  });
  if (!room || room.status !== "active") return false;

  const roundActions = await prisma.gameRoomAction.findMany({
    where: { roomId, roundNumber: room.currentRound },
  });

  const rolesSubmitted = new Set(roundActions.map((entry) => entry.role));
  const readyToResolve = rolesSubmitted.size === ECO_ROLES.length;

  if (!readyToResolve) return false;

  return prisma.$transaction(async (tx) => {
    const latestRoom = await tx.gameRoom.findUnique({
      where: { id: roomId },
      include: {
        actions: { where: { roundNumber: room.currentRound } },
      },
    });
    if (!latestRoom || latestRoom.status !== "active") return false;

    const existingRound = await tx.gameRoomRound.findUnique({
      where: {
        roomId_roundNumber: {
          roomId,
          roundNumber: latestRoom.currentRound,
        },
      },
    });
    if (existingRound?.resolvedAt) return false;

    const monitoringPayload = latestRoom.actions.find(
      (entry) => entry.role === "monitoring"
    )?.payload;
    const policyPayload = latestRoom.actions.find(
      (entry) => entry.role === "policy"
    )?.payload;
    const fundingPayload = latestRoom.actions.find(
      (entry) => entry.role === "funding"
    )?.payload;

    const bundle: RoundActionBundle = {
      monitoring: monitoringPayload
        ? parseJson<MonitoringAction>(monitoringPayload, {
            dossierId: "spectral-scan",
            focus: "air",
            scanIntensity: 1,
            verificationDepth: 1,
            evidenceTone: "cautious",
            releaseWindow: "staged",
            fieldRelay: false,
          })
        : undefined,
      policy: policyPayload
        ? parseJson<PolicyAction>(policyPayload, {
            policyId: "compliance-order",
            emphasis: "compliance",
            intensity: 1,
            publicMessage: "transparent",
            coalitionTarget: "municipal",
            rollout: "regional",
            legalShield: false,
          })
        : undefined,
      funding: fundingPayload
        ? parseJson<FundingAction>(fundingPayload, {
            rapid: 25,
            resilience: 25,
            science: 25,
            community: 25,
            reserveRelease: false,
            releaseMode: "balanced",
            oversight: "balanced",
            externalMatch: false,
          })
        : undefined,
    };

    const scenario = scenarioForRound(latestRoom.scenarioSeed, latestRoom.currentRound);
    const snapshot = asEnvironmentState(latestRoom);
    const resolution = resolveRound(
      snapshot,
      scenario,
      bundle,
      latestRoom.currentRound,
      latestRoom.maxRounds
    );

    await tx.gameRoomRound.upsert({
      where: {
        roomId_roundNumber: {
          roomId,
          roundNumber: latestRoom.currentRound,
        },
      },
      update: {
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        snapshotBefore: JSON.stringify(snapshot),
        resolutionLog: JSON.stringify(resolution.log),
        resolvedAt: new Date(),
      },
      create: {
        roomId,
        roundNumber: latestRoom.currentRound,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        snapshotBefore: JSON.stringify(snapshot),
        resolutionLog: JSON.stringify(resolution.log),
        resolvedAt: new Date(),
      },
    });

    await tx.gameRoom.update({
      where: { id: roomId },
      data: {
        treasury: resolution.nextState.treasury,
        publicTrust: resolution.nextState.publicTrust,
        airQuality: resolution.nextState.airQuality,
        waterSecurity: resolution.nextState.waterSecurity,
        biodiversity: resolution.nextState.biodiversity,
        heatRisk: resolution.nextState.heatRisk,
        currentRound: resolution.finished
          ? latestRoom.currentRound
          : latestRoom.currentRound + 1,
        status: resolution.finished ? "finished" : "active",
        winner: resolution.winner,
        deadlineAt: null,
        lastResolvedAt: new Date(),
      },
    });

    await tx.gameRoomMessage.create({
      data: {
        roomId,
        userName: "SYSTEM",
        kind: "system",
        body: resolution.finished
          ? `Operations concluded with a ${resolution.winner} outcome after round ${latestRoom.currentRound}.`
          : `Round ${latestRoom.currentRound} resolved. ${scenario.title} shifted the desk into a ${resolution.roundGrade} posture.`,
        metadata: JSON.stringify({
          log: resolution.log,
          roundGrade: resolution.roundGrade,
        }),
      },
    });

    return true;
  });
}

// Loads the complete room state used by the lobby and desk screens.
export async function loadRoomState(roomId: string, userId?: string) {
  await maybeResolveRoom(roomId);

  if (userId) {
    await prisma.gameRoomSeat.updateMany({
      where: { roomId, userId },
      data: { lastSeenAt: new Date() },
    });
  }
  await pruneInactiveGameRooms();

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: {
      seats: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      rounds: {
        orderBy: { roundNumber: "desc" },
        take: 5,
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 60,
      },
    },
  });

  if (!room) return null;

  const currentScenario = scenarioForRound(room.scenarioSeed, room.currentRound);
  const currentActions = await prisma.gameRoomAction.findMany({
    where: { roomId, roundNumber: room.currentRound },
    orderBy: { submittedAt: "asc" },
  });
  const userRole = room.seats.find((seat) => seat.userId === userId)?.role ?? null;
  const currentUserAction = userRole
    ? currentActions.find((entry) => entry.role === userRole)
    : null;

  return {
    id: room.id,
    code: room.code,
    title: room.title,
    status: room.status,
    currentRound: room.currentRound,
    maxRounds: room.maxRounds,
    deadlineAt: room.deadlineAt?.toISOString() ?? null,
    winner: room.winner,
    metrics: asEnvironmentState(room),
    scenario: currentScenario,
    availableRoles: ECO_ROLES.filter(
      (role) => !room.seats.some((seat) => seat.role === role)
    ),
    seats: room.seats.map((seat) => ({
      userId: seat.userId,
      userName: seat.user.name,
      role: seat.role,
      ready: seat.ready,
      isSelf: userId ? seat.userId === userId : false,
    })),
    userRole,
    submissions: currentActions.map((entry) => ({
      role: entry.role,
      submittedAt: entry.submittedAt.toISOString(),
      isSelf: userRole ? entry.role === userRole : false,
    })),
    currentUserAction: currentUserAction
      ? parseJson<Record<string, unknown>>(currentUserAction.payload, {})
      : null,
    rounds: room.rounds.map((round) => ({
      roundNumber: round.roundNumber,
      scenarioTitle: round.scenarioTitle,
      resolvedAt: round.resolvedAt?.toISOString() ?? null,
      resolutionLog: parseJson<string[]>(round.resolutionLog, []),
    })),
    messages: room.messages.map((message) => ({
      id: message.id,
      kind: message.kind,
      body: message.body,
      userName: message.userName,
      metadata: parseJson<Record<string, unknown>>(message.metadata, {}),
      createdAt: message.createdAt.toISOString(),
      isSelf: userId ? message.userId === userId : false,
    })),
  };
}
