-- Stores account-bound arcade run results so the menu and summary screens can
-- show each player's personal leaderboard instead of device-local scores.
CREATE TABLE "game_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "duration" REAL NOT NULL,
    "level" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "debris" INTEGER NOT NULL,
    "weapons" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "game_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "game_scores_user_id_score_idx" ON "game_scores"("user_id", "score" DESC);
CREATE INDEX "game_scores_user_id_created_at_idx" ON "game_scores"("user_id", "created_at");
