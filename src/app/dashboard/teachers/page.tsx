
'use client';

import AuthGuard from "@/components/auth-guard";
import TeacherManager from "@/components/teacher-manager";
import { useUser } from "@/firebase";

export default function TeachersPage() {
  const { user } = useUser();
  return (
    <AuthGuard>
      <TeacherManager user={user} />
    </AuthGuard>
  );
}
