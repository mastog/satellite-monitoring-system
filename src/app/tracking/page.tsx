"use client";

import dynamic from "next/dynamic";

const EarthScene = dynamic(() => import("@/components/3d/EarthScene"), {
  ssr: false,
});

const TrackedSatellitesOverlay = dynamic(
  () => import("@/components/3d/TrackedSatellitesOverlay"),
  { ssr: false }
);

const TimelineScrubber = dynamic(
  () => import("@/components/3d/TimelineScrubber"),
  { ssr: false }
);

export default function TrackingPage() {
  return (
    <div className="relative h-full">
      <EarthScene />
      <TrackedSatellitesOverlay />
      <TimelineScrubber />
    </div>
  );
}
