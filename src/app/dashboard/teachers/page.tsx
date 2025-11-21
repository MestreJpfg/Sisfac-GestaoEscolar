
'use client';

import AuthGuard from "@/components/auth-guard";
import TeacherManager from "@/components/teacher-manager";

export default function TeachersPage() {
  return (
    <AuthGuard>
      <TeacherManager />
    </AuthGuard>
  );
}
