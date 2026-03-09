/*
  Warnings:

  - You are about to drop the `space_weather_cache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "space_weather_cache_data_type_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "space_weather_cache";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "purchased_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "article_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "readTime" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "paper_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "abstract" TEXT NOT NULL,
    "doi" TEXT NOT NULL,
    "api_source" TEXT NOT NULL,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "points" INTEGER NOT NULL DEFAULT 0,
    "total_earned" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash") SELECT "created_at", "email", "id", "name", "password_hash" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "article_cache_source_id_key" ON "article_cache"("source_id");

-- CreateIndex
CREATE INDEX "article_cache_category_idx" ON "article_cache"("category");

-- CreateIndex
CREATE INDEX "article_cache_fetched_at_idx" ON "article_cache"("fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "paper_cache_source_id_key" ON "paper_cache"("source_id");

-- CreateIndex
CREATE INDEX "paper_cache_api_source_idx" ON "paper_cache"("api_source");

-- CreateIndex
CREATE INDEX "paper_cache_fetched_at_idx" ON "paper_cache"("fetched_at");
