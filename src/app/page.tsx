
import StudentManager from "@/components/student-manager";

/**
 * This is a Server Component that renders the main application layout.
 * The actual data fetching and logic will now be handled by the client component.
 */
export default async function Home() {
  // All data fetching and logic is now delegated to the StudentManager client component
  // to ensure data is fetched reliably on the client side.
  return <StudentManager />;
}
