const DEFAULT_STATIC_REFRESH_HOUR_UTC = 3;
const DEFAULT_TLE_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000;
const DEFAULT_POSITION_REFRESH_INTERVAL_MS = 10 * 1000;

// Parses numeric refresh settings from the environment while preserving a
// stable fallback when the variable is missing or malformed.
function parseEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const STATIC_REFRESH_HOUR_UTC = parseEnvNumber(
  "STATIC_REFRESH_HOUR_UTC",
  DEFAULT_STATIC_REFRESH_HOUR_UTC
);

export const TLE_REFRESH_INTERVAL_MS = parseEnvNumber(
  "TLE_REFRESH_INTERVAL_MS",
  DEFAULT_TLE_REFRESH_INTERVAL_MS
);

export const POSITION_REFRESH_INTERVAL_MS = parseEnvNumber(
  "POSITION_REFRESH_INTERVAL_MS",
  DEFAULT_POSITION_REFRESH_INTERVAL_MS
);

// Computes the latest scheduled daily refresh boundary so cache readers can
// tell whether the current day has already been refreshed on the server.
export function getLatestDailyRefreshBoundary(
  hourUtc: number,
  now: Date = new Date()
): Date {
  const boundary = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hourUtc,
      0,
      0,
      0
    )
  );

  if (now.getTime() < boundary.getTime()) {
    boundary.setUTCDate(boundary.getUTCDate() - 1);
  }

  return boundary;
}

// Checks whether a daily cache has missed its latest scheduled refresh window.
export function isDailyRefreshDue(
  lastRefreshAt: Date | null,
  hourUtc: number,
  now: Date = new Date()
): boolean {
  const boundary = getLatestDailyRefreshBoundary(hourUtc, now);
  return !lastRefreshAt || lastRefreshAt.getTime() < boundary.getTime();
}

// Checks whether an interval-driven cache is older than the allowed age.
export function isIntervalRefreshDue(
  lastRefreshAt: Date | null,
  intervalMs: number,
  now: Date = new Date()
): boolean {
  return (
    !lastRefreshAt || now.getTime() - lastRefreshAt.getTime() >= intervalMs
  );
}
