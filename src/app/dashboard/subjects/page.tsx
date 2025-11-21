
'use client';

import SubjectManager from "@/components/subject-manager";
import AuthGuard from "@/components/auth-guard";

export default function SubjectsPage() {
  return (
    <AuthGuard>
      <SubjectManager />
    </AuthGuard>
  );
}
