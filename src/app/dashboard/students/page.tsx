'use client';

import StudentManager from "@/components/student-manager";
import AuthGuard from "@/components/auth-guard";
import ProfileCompletionGuard from "@/components/profile-completion-guard";

export default function StudentsPage() {
  return (
    <AuthGuard>
      <ProfileCompletionGuard>
        <StudentManager />
      </ProfileCompletionGuard>
    </AuthGuard>
  );
}
