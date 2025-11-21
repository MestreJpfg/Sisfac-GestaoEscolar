'use client';

import AuthGuard from "@/components/auth-guard";
import ClassDetails from "@/components/class-details";
import ProfileCompletionGuard from "@/components/profile-completion-guard";

export default function ClassDetailsPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
        <ProfileCompletionGuard>
            <ClassDetails classId={params.id} />
        </ProfileCompletionGuard>
    </AuthGuard>
  );
}
