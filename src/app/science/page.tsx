"use client";

import dynamic from "next/dynamic";

const ScienceLab = dynamic(() => import("@/components/science/ScienceLab"), {
  ssr: false,
});

export default function SciencePage() {
  return <ScienceLab />;
}
