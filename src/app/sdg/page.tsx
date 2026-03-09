"use client";

import dynamic from "next/dynamic";

const SDGDashboard = dynamic(() => import("@/components/sdg/SDGDashboard"), {
  ssr: false,
});

export default function SDGPage() {
  return <SDGDashboard />;
}
