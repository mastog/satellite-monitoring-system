"use client";

import dynamic from "next/dynamic";

const GroundNetwork = dynamic(
  () => import("@/components/ground/GroundNetwork"),
  { ssr: false }
);

export default function GroundPage() {
  return <GroundNetwork />;
}
