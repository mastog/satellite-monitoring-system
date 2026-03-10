"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getBaked,
  bakeKey,
  serializeBakedAnimation,
  type SerializedBake,
} from "@/lib/mmd/bakeCache";
import { CHARACTER_MODELS } from "@/lib/mmd/modelData";

interface DanceInfo {
  id: string;
  path: string;
  vmdPath: string;
}

interface ExportStatus {
  stage:
    | "loading-dances"
    | "baking"
    | "collecting"
    | "uploading"
    | "complete"
    | "error";
  message: string;
}

interface BakeProgress {
  current: number;
  total: number;
  characterName: string;
  animLabel: string;
}

interface BakeUploadEntry {
  key: string;
  payload: SerializedBake;
}

// Runs the browser-side bake queue inside a dedicated export page and uploads
// the finished cache files so later profile-page visitors can reuse them.
function MMDBakeExportContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<ExportStatus>({
    stage: "loading-dances",
    message: "Loading dance list",
  });
  const [progress, setProgress] = useState<BakeProgress | null>(null);
  const [writtenCount, setWrittenCount] = useState(0);

  const stageLabel = useMemo(() => {
    switch (status.stage) {
      case "loading-dances":
        return "LOADING_DANCES";
      case "baking":
        return "BAKING";
      case "collecting":
        return "COLLECTING";
      case "uploading":
        return "UPLOADING";
      case "complete":
        return "EXPORT_COMPLETE";
      case "error":
        return "EXPORT_ERROR";
    }
  }, [status.stage]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Reads the current dance list from the same API the viewer uses so
        // the export process covers every live character-and-dance pairing.
        const dancesRes = await fetch("/api/dances", { cache: "no-store" });
        const dancesJson = (await dancesRes.json()) as { dances?: DanceInfo[] };
        const dances = dancesJson.dances ?? [];

        if (dances.length === 0) {
          throw new Error("No dance definitions were returned by /api/dances");
        }

        setStatus({
          stage: "baking",
          message: "Preparing baked animation cache",
        });

        // Reuses the existing pre-bake pipeline so exported payloads match the
        // exact cache format the profile viewer already expects at runtime.
        const { preBakeAll } = await import("@/lib/mmd/preBakeAll");
        await preBakeAll(
          CHARACTER_MODELS,
          dances.map((dance) => ({
            id: dance.id,
            path: dance.vmdPath,
          })),
          (nextProgress) => {
            if (!cancelled) setProgress(nextProgress);
          }
        );

        if (cancelled) return;

        setStatus({
          stage: "collecting",
          message: "Collecting baked animation payloads",
        });

        // Reads the local IndexedDB entries that were produced by the bake
        // pipeline and converts them into a serializable upload payload.
        const files: BakeUploadEntry[] = [];

        for (const model of CHARACTER_MODELS) {
          for (const dance of dances) {
            const key = bakeKey(model.id, dance.vmdPath);
            const baked = await getBaked(key);
            if (!baked) continue;
            files.push({
              key,
              payload: serializeBakedAnimation(baked),
            });
          }
        }

        if (files.length === 0) {
          throw new Error("No baked animation payloads were found in IndexedDB");
        }

        setStatus({
          stage: "uploading",
          message: `Uploading ${files.length} baked payloads`,
        });

        // Sends the payloads in small batches so a single large request does
        // not fail after the expensive bake work has already completed.
        const batchSize = 4;
        let written = 0;

        for (let i = 0; i < files.length; i += batchSize) {
          const batch = files.slice(i, i + batchSize);
          const res = await fetch("/api/mmd/bakes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-mmd-bake-secret": token,
            },
            body: JSON.stringify({ files: batch }),
          });

          if (!res.ok) {
            throw new Error(`Upload batch failed with status ${res.status}`);
          }

          written += batch.length;
          if (!cancelled) setWrittenCount(written);
        }

        if (!cancelled) {
          setStatus({
            stage: "complete",
            message: `Exported ${written} baked payloads`,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setStatus({
            stage: "error",
            message: err instanceof Error ? err.message : "Unknown export error",
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#06080d",
        color: "#d8e4ff",
        fontFamily: "monospace",
      }}
    >
      <h1 style={{ marginBottom: "16px" }}>MMD Bake Export</h1>
      <p id="stage">{stageLabel}</p>
      <p id="message">{status.message}</p>
      {progress && (
        <p id="progress">
          {progress.current}/{progress.total} {progress.characterName} -{" "}
          {progress.animLabel}
        </p>
      )}
      <p id="written">{writtenCount}</p>
    </main>
  );
}

// Wraps the export page in Suspense so reading search params remains compatible
// with the app router's production build checks.
export default function MMDBakeExportPage() {
  return (
    <Suspense
      fallback={<main style={{ minHeight: "100vh", background: "#06080d" }} />}
    >
      <MMDBakeExportContent />
    </Suspense>
  );
}
