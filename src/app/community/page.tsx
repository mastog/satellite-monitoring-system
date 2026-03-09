"use client";

import dynamic from "next/dynamic";

const CommunityHub = dynamic(
  () => import("@/components/community/CommunityHub"),
  { ssr: false }
);

export default function CommunityPage() {
  return <CommunityHub />;
}
