'use client';

import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";

export default function UsersPage() {
  return (
    <AuthGuard>
      <UserManager />
    </AuthGuard>
  );
}
