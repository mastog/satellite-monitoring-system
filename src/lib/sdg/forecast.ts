/**
 * Implements Holt's double exponential smoothing for lightweight SDG
 * forecasting. The module estimates level and trend from historical scores,
 * tunes smoothing parameters through a small grid search, and returns forecast
 * points with widening confidence intervals for multi-year projections.
 */

export interface ForecastPoint {
  year: number;
  score: number;
  lower: number;
  upper: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  trendDirection: "improving" | "declining" | "stable";
  trendPerYear: number;
  projectedScore2030: number;
  modelConfidence: number;
  alpha: number;
  beta: number;
  modelLabel?: string;
}

/**
 * Produces a multi-year forecast from yearly SDG scores using Holt's linear
 * exponential smoothing. When no horizon is supplied, the forecast extends to
 * at least 2030 so the dashboard can show its headline projection.
 */
export function holtForecast(
  data: { year: number; score: number }[],
  horizon?: number
): ForecastResult | null {
  if (data.length < 3) return null;

  const sorted = [...data].sort((a, b) => a.year - b.year);
  const n = sorted.length;
  const scores = sorted.map((d) => d.score);
  const lastYear = sorted[n - 1].year;

  // Extends the forecast to 2030 by default so SDG cards can show a consistent
  // long-range projection even when the caller omits a horizon.
  const h = horizon ?? Math.max(3, 2030 - lastYear);

  // Searches a compact alpha/beta grid and keeps the parameter pair that
  // minimizes one-step-ahead mean squared error on the historical series.
  let bestAlpha = 0.5;
  let bestBeta = 0.2;
  let bestMSE = Infinity;

  for (let a = 0.1; a <= 0.9; a += 0.1) {
    for (let b = 0.05; b <= 0.5; b += 0.05) {
      let L = scores[0];
      let T = (scores[Math.min(2, n - 1)] - scores[0]) / Math.min(2, n - 1);
      let mse = 0;

      for (let i = 1; i < n; i++) {
        const f = L + T;
        mse += (scores[i] - f) ** 2;
        const newL = a * scores[i] + (1 - a) * (L + T);
        T = b * (newL - L) + (1 - b) * T;
        L = newL;
      }

      mse /= n - 1;
      if (mse < bestMSE) {
        bestMSE = mse;
        bestAlpha = a;
        bestBeta = b;
      }
    }
  }

  // Replays the series with the best alpha/beta pair to recover the final
  // level and trend values used for forecasting.
  let level = scores[0];
  let trend = (scores[Math.min(2, n - 1)] - scores[0]) / Math.min(2, n - 1);
  const residuals: number[] = [];

  for (let i = 1; i < n; i++) {
    const f = level + trend;
    residuals.push(scores[i] - f);
    const newLevel = bestAlpha * scores[i] + (1 - bestAlpha) * (level + trend);
    trend = bestBeta * (newLevel - level) + (1 - bestBeta) * trend;
    level = newLevel;
  }

  // Uses residual spread as the base uncertainty estimate for confidence intervals.
  const sigma = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / residuals.length
  );

  // Generates forecast points and widens the confidence interval as the
  // forecast horizon grows using Holt's variance approximation.
  const z = 1.96; // 95% CI
  const points: ForecastPoint[] = [];

  for (let step = 1; step <= h; step++) {
    const pointForecast = level + step * trend;

    // Accumulates the horizon-dependent variance term used by Holt's interval estimate.
    let varSum = 1;
    for (let j = 1; j < step; j++) {
      const c = bestAlpha + j * bestAlpha * bestBeta;
      varSum += c * c;
    }
    const ci = z * sigma * Math.sqrt(varSum);

    const score = clamp(round1(pointForecast));
    points.push({
      year: lastYear + step,
      score,
      lower: clamp(round1(pointForecast - ci)),
      upper: clamp(round1(pointForecast + ci)),
    });
  }

  // Derives the summary metrics displayed by the SDG forecast UI.
  const projected2030 =
    points.find((p) => p.year === 2030)?.score ??
    points[points.length - 1].score;

  const trendDirection: ForecastResult["trendDirection"] =
    trend > 0.5 ? "improving" : trend < -0.5 ? "declining" : "stable";

  // Blends fit quality and data sufficiency into a compact confidence score.
  const dataRange = Math.max(...scores) - Math.min(...scores) || 1;
  const fitQuality = Math.max(0, 1 - sigma / dataRange);
  const dataSufficiency = Math.min(1, n / 8);
  const modelConfidence =
    Math.round((fitQuality * 0.7 + dataSufficiency * 0.3) * 100) / 100;

  return {
    points,
    trendDirection,
    trendPerYear: Math.round(trend * 10) / 10,
    projectedScore2030: Math.round(projected2030),
    modelConfidence,
    alpha: Math.round(bestAlpha * 100) / 100,
    beta: Math.round(bestBeta * 100) / 100,
    modelLabel: "Holt ES",
  };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
