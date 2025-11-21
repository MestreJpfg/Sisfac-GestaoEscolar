'use client';

import ClassManager from "@/components/class-manager";
import AuthGuard from "@/components/auth-guard";
import ProfileCompletionGuard from "@/components/profile-completion-guard";

export default function ClassesPage() {
  return (
    <AuthGuard>
        <ProfileCompletionGuard>
            <ClassManager />
        </ProfileCompletionGuard>
    </AuthGuard>
  );
}
