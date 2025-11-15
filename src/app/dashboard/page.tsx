'use client';

import StudentManager from "@/components/student-manager";
import AuthGuard from "@/components/auth-guard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <StudentManager />
    </AuthGuard>
  );
}
