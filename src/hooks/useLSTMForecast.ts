"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { holtForecast, type ForecastResult } from "@/lib/sdg/forecast";

type Status = "idle" | "training" | "predicting" | "done" | "error";

interface TrainProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
}

interface UseLSTMForecastResult {
  status: Status;
  progress: TrainProgress | null;
  result: ForecastResult | null;
  modelLabel: string;
}

interface Options {
  horizon: number;
  enabled: boolean;
}

/**
 * Drives the forecasting lifecycle for the SDG dashboard.
 * The hook loads the TF.js GRU pipeline only when forecasting is enabled,
 * reuses an existing trained model while the pooled training dataset stays
 * unchanged, publishes progress updates for the UI, and falls back to Holt
 * exponential smoothing when model training or inference cannot complete.
 */
export function useLSTMForecast(
  allSeries: { year: number; score: number }[][],
  targetSeries: { year: number; score: number }[],
  options: Options
): UseLSTMForecastResult {
  const { horizon, enabled } = options;

  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<TrainProgress | null>(null);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [modelLabel, setModelLabel] = useState("GRU Neural Network");

  // Stores the current model instance so repeated forecasts can reuse it until
  // the pooled training dataset actually changes.
  const modelRef = useRef<unknown>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Remembers which series collection produced modelRef so the hook knows
  // whether a full retrain is required before the next prediction.
  const trainedOnRef = useRef<{ year: number; score: number }[][] | null>(null);

  const fallbackToHolt = useCallback(() => {
    if (targetSeries.length < 3) {
      setResult(null);
      setStatus("done");
      setModelLabel("GRU Neural Network");
      return;
    }
    const holt = holtForecast(targetSeries, horizon);
    if (holt) {
      holt.modelLabel = "Holt ES (fallback)";
    }
    setResult(holt);
    setModelLabel("Holt ES (fallback)");
    setStatus("done");
  }, [targetSeries, horizon]);

  useEffect(() => {
    abortRef.current?.abort();

    if (!enabled) {
      setStatus("idle");
      setProgress(null);
      setResult(null);
      return;
    }

    setResult(null);
    setProgress(null);

    if (targetSeries.length < 3) {
      setStatus("done");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let disposed = false;

    (async () => {
      try {
        // Defers the heavy forecasting bundle until the caller explicitly
        // requests predictions, which keeps the initial UI load lighter.
        const { trainGRUModel, gruForecast, disposeModel } =
          await import("@/lib/sdg/lstmForecast");

        if (controller.signal.aborted) return;

        const needsRetrain = trainedOnRef.current !== allSeries;

        if (needsRetrain) {
          if (modelRef.current) {
            disposeModel(modelRef.current);
            modelRef.current = null;
          }

          setStatus("training");
          setProgress(null);
          setModelLabel("GRU Neural Network");

          const model = await trainGRUModel(
            allSeries,
            (epoch, totalEpochs, loss) => {
              if (!controller.signal.aborted) {
                setProgress({ epoch, totalEpochs, loss });
              }
            },
            controller.signal
          );

          if (controller.signal.aborted) {
            disposeModel(model);
            return;
          }

          modelRef.current = model;
          trainedOnRef.current = allSeries;
        }

        if (controller.signal.aborted) return;

        setStatus("predicting");
        const forecastPoints = await gruForecast(
          modelRef.current!,
          targetSeries,
          horizon
        );

        if (controller.signal.aborted) return;

        const projectedScore2030 =
          forecastPoints.find((p) => p.year === 2030)?.score ??
          forecastPoints[forecastPoints.length - 1]?.score ??
          0;

        const lastScore = targetSeries[targetSeries.length - 1]?.score ?? 0;
        const firstForecast = forecastPoints[0]?.score ?? lastScore;
        const lastForecast =
          forecastPoints[forecastPoints.length - 1]?.score ?? firstForecast;
        const trendPerYear =
          forecastPoints.length > 1
            ? (lastForecast - firstForecast) / (forecastPoints.length - 1)
            : lastForecast - lastScore;
        const trendDirection: ForecastResult["trendDirection"] =
          trendPerYear > 0.5
            ? "improving"
            : trendPerYear < -0.5
              ? "declining"
              : "stable";

        // Converts the average confidence-interval width into a compact
        // confidence score that the UI can display alongside the forecast.
        const avgCIWidth =
          forecastPoints.reduce((s, p) => s + (p.upper - p.lower), 0) /
          (forecastPoints.length || 1);
        const modelConfidence = Math.max(
          0,
          Math.min(1, Math.round((1 - avgCIWidth / 100) * 100) / 100)
        );

        setResult({
          points: forecastPoints,
          trendDirection,
          trendPerYear: Math.round(trendPerYear * 10) / 10,
          projectedScore2030: Math.round(projectedScore2030),
          modelConfidence,
          alpha: 0,
          beta: 0,
          modelLabel: "GRU (TF.js)",
        });
        setModelLabel("GRU Neural Network");
        setStatus("done");
      } catch (err) {
        if (disposed || controller.signal.aborted) return;
        console.error("[useLSTMForecast] Error, falling back to Holt ES:", err);
        fallbackToHolt();
        setStatus("error");
      }
    })();

    return () => {
      disposed = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, allSeries, targetSeries, horizon]);

  useEffect(() => {
    return () => {
      if (modelRef.current) {
        import("@/lib/sdg/lstmForecast").then(({ disposeModel }) => {
          disposeModel(modelRef.current);
          modelRef.current = null;
        });
      }
    };
  }, []);

  return { status, progress, result, modelLabel };
}
