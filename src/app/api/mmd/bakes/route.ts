import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  bakeAssetFileName,
  type SerializedBake,
} from "@/lib/mmd/bakeCache";

interface BakeUploadEntry {
  key: string;
  payload: SerializedBake;
}

// Persists browser-generated bake payloads as public assets so later visitors
// can download the finished cache instead of rebuilding it on their own device.
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.MMD_BAKE_SECRET;
    const providedSecret = req.headers.get("x-mmd-bake-secret");

    if (!secret || providedSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { files?: BakeUploadEntry[] };
    const files = body.files ?? [];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No bake files supplied" },
        { status: 400 }
      );
    }

    // Writes every uploaded payload into the static asset directory that the
    // viewer already queries when it looks for server-hosted bake caches.
    const outputDir = path.join(process.cwd(), "public", "mmd-bakes");
    await mkdir(outputDir, { recursive: true });

    await Promise.all(
      files.map(async ({ key, payload }) => {
        const filePath = path.join(outputDir, bakeAssetFileName(key));
        await writeFile(filePath, JSON.stringify(payload));
      })
    );

    return NextResponse.json({
      written: files.length,
      outputDir,
    });
  } catch (err) {
    console.error("MMD bake export API error:", err);
    return NextResponse.json(
      { error: "Failed to persist MMD bake cache" },
      { status: 500 }
    );
  }
}
