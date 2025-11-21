
'use client';

import StudentManager from "@/components/student-manager";
import AuthGuard from "@/components/auth-guard";

export default function StudentsPage() {
  return (
    <AuthGuard>
      <StudentManager />
    </AuthGuard>
  );
}
