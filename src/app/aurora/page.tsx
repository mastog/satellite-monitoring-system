"use client";

import dynamic from "next/dynamic";

const AuroraView = dynamic(() => import("@/components/aurora/AuroraView"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
      />
    </div>
  ),
});

export default function AuroraPage() {
  return <AuroraView />;
}
