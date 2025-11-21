
'use client';

import AuthGuard from "@/components/auth-guard";
import ClassDetails from "@/components/class-details";

export default function ClassDetailsPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
        <ClassDetails classId={params.id} />
    </AuthGuard>
  );
}
