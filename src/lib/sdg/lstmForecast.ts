/**
 * Implements the browser-side GRU forecasting pipeline used by the SDG UI.
 * The module trains a compact recurrent model on pooled series data and uses
 * Monte Carlo Dropout during inference to estimate prediction uncertainty.
 */

import type { ForecastPoint } from "./forecast";

// Caches the lazily loaded TF.js module so repeated forecasts do not reload it.
let tf: typeof import("@tensorflow/tfjs") | null = null;

// Loads TensorFlow.js on demand and waits for the runtime to become ready
// before any tensors or models are created.
async function ensureTF() {
  if (!tf) {
    tf = await import("@tensorflow/tfjs");
    await tf.ready();
  }
  return tf;
}

const WINDOW_SIZE = 4;
const MC_SAMPLES = 30;

export interface TrainProgressCallback {
  (epoch: number, totalEpochs: number, loss: number): void;
}

interface NormParams {
  min: number;
  max: number;
}

// Normalizes a score series into the 0-1 range and returns the parameters
// needed to invert the scaling later.
function normalize(values: number[]): {
  normalized: number[];
  params: NormParams;
} {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return {
    normalized: values.map((v) => (v - min) / range),
    params: { min, max },
  };
}

// Restores a normalized prediction back into the original score range.
function denormalize(value: number, params: NormParams): number {
  return value * (params.max - params.min || 1) + params.min;
}

// Clamps predictions into the SDG score range and rounds them for display use.
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

/**
 * Converts a single normalized series into overlapping sliding-window samples
 * that the recurrent model can use for next-step prediction training.
 */
function buildSamples(series: number[]): { xs: number[][]; ys: number[] } {
  const xs: number[][] = [];
  const ys: number[] = [];
  for (let i = 0; i <= series.length - WINDOW_SIZE - 1; i++) {
    xs.push(series.slice(i, i + WINDOW_SIZE));
    ys.push(series[i + WINDOW_SIZE]);
  }
  return { xs, ys };
}

/**
 * Trains a compact GRU model on samples pooled from multiple SDG time series.
 * Pooling lets the browser model learn a shared temporal pattern even when any
 * single region has only a small number of observations.
 */
export async function trainGRUModel(
  allSeries: { year: number; score: number }[][],
  onProgress?: TrainProgressCallback,
  signal?: AbortSignal
): Promise<unknown> {
  const tfjs = await ensureTF();

  // Pools windows from every eligible series so the model learns from the
  // broader dataset rather than from a single short sequence.
  const allXs: number[][] = [];
  const allYs: number[] = [];

  for (const series of allSeries) {
    if (series.length < WINDOW_SIZE + 1) continue;
    const scores = series.map((d) => d.score);
    const { normalized } = normalize(scores);
    const { xs, ys } = buildSamples(normalized);
    allXs.push(...xs);
    allYs.push(...ys);
  }

  if (allXs.length < 4) {
    throw new Error("Insufficient training data: need at least 4 samples");
  }

  // Uses a small GRU followed by a dense output layer to keep browser-side
  // training fast enough for interactive use.
  const model = tfjs.sequential();
  model.add(
    tfjs.layers.gru({
      units: 8,
      inputShape: [WINDOW_SIZE, 1],
      dropout: 0.2,
      recurrentDropout: 0.2,
    })
  );
  model.add(tfjs.layers.dense({ units: 1 }));

  model.compile({
    optimizer: tfjs.train.adam(0.01),
    loss: "meanSquaredError",
  });

  // Converts the pooled samples into tensors with the [batch, time, feature]
  // shape expected by the GRU layer.
  const xTensor = tfjs.tensor3d(
    allXs.map((row) => row.map((v) => [v])),
    [allXs.length, WINDOW_SIZE, 1]
  );
  const yTensor = tfjs.tensor2d(allYs, [allYs.length, 1]);

  try {
    let stopped = false;

    signal?.addEventListener("abort", () => {
      stopped = true;
    });

    await model.fit(xTensor, yTensor, {
      epochs: 50,
      batchSize: Math.min(8, allXs.length),
      shuffle: true,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          if (stopped) {
            model.stopTraining = true;
            return;
          }
          onProgress?.(epoch + 1, 50, logs?.loss ?? 0);
        },
      },
    });
  } finally {
    xTensor.dispose();
    yTensor.dispose();
  }

  return model;
}

/**
 * Runs iterative GRU inference with Monte Carlo Dropout enabled so each
 * forecast step returns both a central estimate and an uncertainty interval.
 */
export async function gruForecast(
  model: unknown,
  historical: { year: number; score: number }[],
  horizon: number
): Promise<ForecastPoint[]> {
  const tfjs = await ensureTF();
  const tfModel = model as import("@tensorflow/tfjs").LayersModel;

  const sorted = [...historical].sort((a, b) => a.year - b.year);
  const scores = sorted.map((d) => d.score);
  const { normalized, params } = normalize(scores);

  const lastYear = sorted[sorted.length - 1].year;
  const points: ForecastPoint[] = [];

  // Collects multiple stochastic trajectories by keeping dropout active during
  // inference, which approximates prediction uncertainty.
  const trajectories: number[][] = [];

  for (let s = 0; s < MC_SAMPLES; s++) {
    let window = normalized.slice(-WINDOW_SIZE);
    const trajectory: number[] = [];

    for (let step = 0; step < horizon; step++) {
      const input = tfjs.tensor3d(
        [window.map((v) => [v])],
        [1, WINDOW_SIZE, 1]
      );
      // Keeps dropout active during inference so each pass contributes to the
      // Monte Carlo uncertainty estimate.
      const pred = tfModel.apply(input, {
        training: true,
      }) as import("@tensorflow/tfjs").Tensor;
      const value = (await pred.data())[0];
      input.dispose();
      pred.dispose();

      trajectory.push(value);
      window = [...window.slice(1), value];
    }

    trajectories.push(trajectory);
  }

  // Aggregates the sampled trajectories into a mean forecast and a 95% interval.
  for (let step = 0; step < horizon; step++) {
    const stepValues = trajectories.map((t) => t[step]).sort((a, b) => a - b);

    const mean = stepValues.reduce((sum, v) => sum + v, 0) / stepValues.length;
    const lowerIdx = Math.floor(stepValues.length * 0.025);
    const upperIdx = Math.min(
      stepValues.length - 1,
      Math.ceil(stepValues.length * 0.975)
    );

    points.push({
      year: lastYear + step + 1,
      score: clamp(denormalize(mean, params)),
      lower: clamp(denormalize(stepValues[lowerIdx], params)),
      upper: clamp(denormalize(stepValues[upperIdx], params)),
    });
  }

  return points;
}

/**
 * Disposes a trained model instance so browser memory is released after the
 * caller no longer needs the forecast model.
 */
export function disposeModel(model: unknown): void {
  if (
    model &&
    typeof (model as { dispose?: () => void }).dispose === "function"
  ) {
    (model as { dispose: () => void }).dispose();
  }
}
