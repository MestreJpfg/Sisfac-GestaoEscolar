
'use client';

import ProfileManager from "@/components/profile-manager";
import AuthGuard from "@/components/auth-guard";

export default function ProfilesPage() {
  return (
    <AuthGuard>
        <ProfileManager />
    </AuthGuard>
  );
}
