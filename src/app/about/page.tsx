"use client";

import dynamic from "next/dynamic";

const AboutView = dynamic(() => import("@/components/about/AboutView"), {
  ssr: false,
});

export default function AboutPage() {
  return <AboutView />;
}
