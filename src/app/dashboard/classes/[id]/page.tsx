
import AuthGuard from "@/components/auth-guard";
import ClassDetails from "@/components/class-details";

// This is now a Server Component
export default function ClassDetailsPage({ params }: { params: { id: string } }) {
  return (
    <AuthGuard>
        {/* The `id` is resolved on the server and passed to the client component */}
        <ClassDetails classId={params.id} />
    </AuthGuard>
  );
}
