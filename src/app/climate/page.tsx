"use client";

import dynamic from "next/dynamic";

const ClimateMonitor = dynamic(
  () => import("@/components/climate/ClimateMonitor"),
  { ssr: false }
);

export default function ClimatePage() {
  return <ClimateMonitor />;
}
