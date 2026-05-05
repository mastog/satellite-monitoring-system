-- Creates the multiplayer environmental operations tables that power the new
-- turn-based desk simulation.

CREATE TABLE "game_rooms" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'waiting',
  "title" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "current_round" INTEGER NOT NULL DEFAULT 1,
  "max_rounds" INTEGER NOT NULL DEFAULT 8,
  "scenario_seed" INTEGER NOT NULL DEFAULT 0,
  "treasury" INTEGER NOT NULL DEFAULT 72,
  "public_trust" INTEGER NOT NULL DEFAULT 68,
  "air_quality" INTEGER NOT NULL DEFAULT 64,
  "water_security" INTEGER NOT NULL DEFAULT 61,
  "biodiversity" INTEGER NOT NULL DEFAULT 58,
  "heat_risk" INTEGER NOT NULL DEFAULT 47,
  "deadline_at" DATETIME,
  "last_resolved_at" DATETIME,
  "winner" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL,
  CONSTRAINT "game_rooms_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "game_rooms_code_key" ON "game_rooms"("code");
CREATE INDEX "game_rooms_status_updated_at_idx" ON "game_rooms"("status", "updated_at");
CREATE INDEX "game_rooms_created_by_id_idx" ON "game_rooms"("created_by_id");

CREATE TABLE "game_room_seats" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT false,
  "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_room_seats_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "game_rooms" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_room_seats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "game_room_seats_room_id_role_key" ON "game_room_seats"("room_id", "role");
CREATE UNIQUE INDEX "game_room_seats_room_id_user_id_key" ON "game_room_seats"("room_id", "user_id");
CREATE INDEX "game_room_seats_user_id_joined_at_idx" ON "game_room_seats"("user_id", "joined_at");

CREATE TABLE "game_room_rounds" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "round_number" INTEGER NOT NULL,
  "scenario_id" TEXT NOT NULL,
  "scenario_title" TEXT NOT NULL,
  "snapshot_before" TEXT NOT NULL DEFAULT '{}',
  "resolution_log" TEXT NOT NULL DEFAULT '[]',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" DATETIME,
  CONSTRAINT "game_room_rounds_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "game_rooms" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "game_room_rounds_room_id_round_number_key" ON "game_room_rounds"("room_id", "round_number");
CREATE INDEX "game_room_rounds_room_id_resolved_at_idx" ON "game_room_rounds"("room_id", "resolved_at");

CREATE TABLE "game_room_actions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "round_number" INTEGER NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_room_actions_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "game_rooms" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_room_actions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "game_room_actions_room_id_round_number_role_key" ON "game_room_actions"("room_id", "round_number", "role");
CREATE INDEX "game_room_actions_room_id_round_number_idx" ON "game_room_actions"("room_id", "round_number");
CREATE INDEX "game_room_actions_user_id_submitted_at_idx" ON "game_room_actions"("user_id", "submitted_at");

CREATE TABLE "game_room_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT,
  "user_name" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'text',
  "body" TEXT NOT NULL,
  "metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_room_messages_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "game_rooms" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_room_messages_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "game_room_messages_room_id_created_at_idx" ON "game_room_messages"("room_id", "created_at");
