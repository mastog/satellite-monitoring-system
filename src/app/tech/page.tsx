"use client";

import dynamic from "next/dynamic";

const TechView = dynamic(() => import("@/components/tech/TechView"), {
  ssr: false,
});

export default function TechPage() {
  return <TechView />;
}
