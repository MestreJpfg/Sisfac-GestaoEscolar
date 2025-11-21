
'use client';

import AuthGuard from "@/components/auth-guard";
import SubjectManager from "@/components/subject-manager";

export default function SubjectsPage() {
  return (
    <AuthGuard>
      <SubjectManager />
    </AuthGuard>
  );
}
