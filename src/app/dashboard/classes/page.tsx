'use client';

import ClassManager from "@/components/class-manager";
import AuthGuard from "@/components/auth-guard";

export default function ClassesPage() {
  return (
    <AuthGuard>
      <ClassManager />
    </AuthGuard>
  );
}
