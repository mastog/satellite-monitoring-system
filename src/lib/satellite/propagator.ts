import * as satellite from "satellite.js";

// Defines the normalized propagated satellite position returned to the UI.
export interface SatPosition {
  lat: number;
  lng: number;
  alt: number;
  velocity: number;
}

// Defines one parsed TLE record consisting of a name and the two TLE lines.
export interface TLERecord {
  name: string;
  tle1: string;
  tle2: string;
}

/**
 * Parses raw TLE text into normalized name-plus-lines records.
 */
export function parseTLEText(text: string): TLERecord[] {
  const lines = text.trim().split("\n");
  const records: TLERecord[] = [];
  for (let i = 0; i < lines.length - 2; i += 3) {
    const name = lines[i].trim();
    const tle1 = lines[i + 1].trim();
    const tle2 = lines[i + 2].trim();
    if (tle1.startsWith("1 ") && tle2.startsWith("2 ")) {
      records.push({ name, tle1, tle2 });
    }
  }
  return records;
}

/**
 * Propagates a TLE to a specific time and returns the resulting geodetic
 * position and velocity needed by the tracking views.
 */
export function propagate(
  tle1: string,
  tle2: string,
  date: Date
): SatPosition | null {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    const result = satellite.propagate(satrec, date);

    if (!result || typeof result.position === "boolean" || !result.position)
      return null;

    const posEci = result.position;
    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(posEci, gmst);

    const vel = result.velocity;
    let speed = 0;
    if (vel && typeof vel !== "boolean") {
      speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    }

    return {
      lat: satellite.degreesLat(geo.latitude),
      lng: satellite.degreesLong(geo.longitude),
      alt: geo.height,
      velocity: speed,
    };
  } catch {
    return null;
  }
}

/**
 * Checks whether the propagated satellite is above the observer's minimum
 * elevation threshold at the requested time.
 */
export function isVisibleFrom(
  tle1: string,
  tle2: string,
  observerLat: number,
  observerLng: number,
  date: Date,
  maxElevation = 10
): boolean {
  try {
    const satrec = satellite.twoline2satrec(tle1, tle2);
    const result = satellite.propagate(satrec, date);
    if (!result || typeof result.position === "boolean" || !result.position)
      return false;

    const posEci = result.position;
    const gmst = satellite.gstime(date);
    const observerGd = {
      longitude: satellite.degreesToRadians(observerLng),
      latitude: satellite.degreesToRadians(observerLat),
      height: 0,
    };

    const lookAngles = satellite.ecfToLookAngles(
      observerGd,
      satellite.eciToEcf(posEci, gmst)
    );

    const elevationDeg = (lookAngles.elevation * 180) / Math.PI;
    return elevationDeg > maxElevation;
  } catch {
    return false;
  }
}

/**
 * Generates a sequence of propagated points that can be drawn as an orbit path.
 */
export function generateOrbitPath(
  tle1: string,
  tle2: string,
  startDate: Date,
  durationMinutes = 90,
  stepMinutes = 1
): SatPosition[] {
  const path: SatPosition[] = [];
  for (let m = 0; m <= durationMinutes; m += stepMinutes) {
    const d = new Date(startDate.getTime() + m * 60000);
    const pos = propagate(tle1, tle2, d);
    if (pos) path.push(pos);
  }
  return path;
}
