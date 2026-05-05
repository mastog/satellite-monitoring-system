-- Adds online presence tracking for room seats so inactive rooms can be
-- reclaimed automatically.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_game_room_seats" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "room_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT false,
  "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "game_room_seats_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "game_rooms" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "game_room_seats_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_game_room_seats" (
  "id",
  "room_id",
  "user_id",
  "role",
  "ready",
  "joined_at",
  "last_seen_at"
)
SELECT
  "id",
  "room_id",
  "user_id",
  "role",
  "ready",
  "joined_at",
  CURRENT_TIMESTAMP
FROM "game_room_seats";

DROP TABLE "game_room_seats";
ALTER TABLE "new_game_room_seats" RENAME TO "game_room_seats";

CREATE UNIQUE INDEX "game_room_seats_room_id_role_key" ON "game_room_seats"("room_id", "role");
CREATE UNIQUE INDEX "game_room_seats_room_id_user_id_key" ON "game_room_seats"("room_id", "user_id");
CREATE INDEX "game_room_seats_user_id_joined_at_idx" ON "game_room_seats"("user_id", "joined_at");
CREATE INDEX "game_room_seats_room_id_last_seen_at_idx" ON "game_room_seats"("room_id", "last_seen_at");

PRAGMA foreign_keys=ON;
