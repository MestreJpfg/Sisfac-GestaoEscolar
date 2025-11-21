'use client';

import ProfileManager from "@/components/profile-manager";
import AuthGuard from "@/components/auth-guard";
import ProfileCompletionGuard from "@/components/profile-completion-guard";

export default function ProfilesPage() {
  return (
    <AuthGuard>
        <ProfileCompletionGuard>
            <ProfileManager />
        </ProfileCompletionGuard>
    </AuthGuard>
  );
}
