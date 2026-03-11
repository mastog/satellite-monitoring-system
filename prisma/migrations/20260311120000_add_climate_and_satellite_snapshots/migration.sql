CREATE TABLE "climate_event_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "severity" INTEGER NOT NULL,
    "detecting_satellite" TEXT NOT NULL,
    "detection_date" TEXT NOT NULL,
    "sdg_impact" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL,
    "area_affected_km2" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "magnitude" REAL,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "climate_event_cache_event_id_key" ON "climate_event_cache"("event_id");
CREATE INDEX "climate_event_cache_type_idx" ON "climate_event_cache"("type");
CREATE INDEX "climate_event_cache_fetched_at_idx" ON "climate_event_cache"("fetched_at");

CREATE TABLE "satellite_snapshot" (
    "satellite_id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "norad_id" INTEGER NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "alt" REAL NOT NULL,
    "velocity" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "tle1" TEXT,
    "tle2" TEXT,
    "sat_group" TEXT,
    "epoch_age" REAL,
    "snapshot_at" DATETIME NOT NULL,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "satellite_snapshot_fetched_at_idx" ON "satellite_snapshot"("fetched_at");
CREATE INDEX "satellite_snapshot_sat_group_idx" ON "satellite_snapshot"("sat_group");
