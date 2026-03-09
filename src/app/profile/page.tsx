"use client";

import dynamic from "next/dynamic";

const ProfileView = dynamic(() => import("@/components/profile/ProfileView"), {
  ssr: false,
});

export default function ProfilePage() {
  return <ProfileView />;
}
