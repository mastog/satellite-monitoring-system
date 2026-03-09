import { prisma } from "@/lib/prisma";

export async function createConjunctionNotification(
  userId: string,
  sat1: string,
  sat2: string,
  distanceKm: number
) {
  return prisma.notification.create({
    data: {
      userId,
      type: "conjunction",
      title: "Conjunction Alert",
      body: `Close approach detected: ${sat1} and ${sat2} within ${distanceKm}km`,
      metadata: JSON.stringify({ sat1, sat2, distanceKm }),
    },
  });
}

export async function createCommentReplyNotification(
  userId: string,
  commenterName: string,
  postId: string,
  postTitle: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type: "comment_reply",
      title: "New Comment",
      body: `${commenterName} commented on "${postTitle}"`,
      metadata: JSON.stringify({ commenterName, postId, postTitle }),
    },
  });
}

export async function createMedalNotification(
  userId: string,
  medalName: string,
  medalIcon: string
) {
  // Reuses an existing medal notification so the same unlock does not create duplicate inbox entries.
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: "medal_unlock",
      metadata: { contains: medalName },
    },
  });

  if (existing) return existing;

  return prisma.notification.create({
    data: {
      userId,
      type: "medal_unlock",
      title: "Medal Unlocked!",
      body: `${medalIcon} You earned the "${medalName}" medal`,
      metadata: JSON.stringify({ medalName, medalIcon }),
    },
  });
}
