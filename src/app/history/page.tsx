"use client";

import dynamic from "next/dynamic";

const HistoryView = dynamic(() => import("@/components/history/HistoryView"), {
  ssr: false,
});

export default function HistoryPage() {
  return <HistoryView />;
}
