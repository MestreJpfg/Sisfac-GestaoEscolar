
import { getFirestoreServer } from "@/firebase/server-init";
import { getStudentData } from "@/services/student-service";
import StudentManager from "@/components/student-manager";
import { type DataItem } from "@/components/data-viewer";
import { FirestorePermissionError } from "@/firebase/errors";

/**
 * This is a Server Component that fetches the initial student data.
 * It then passes this data to the client-side StudentManager component.
 */
export default async function Home() {
  const firestore = getFirestoreServer();
  let initialData: DataItem[] = [];
  let errorLoading: string | null = null;

  try {
    const studentData = await getStudentData(firestore);
    // Sort data on the server before passing it to the client
    initialData = studentData.sort((a, b) => {
        const nameA = a.mainItem || "";
        const nameB = b.mainItem || "";
        return nameA.localeCompare(nameB);
    });
  } catch (error) {
     if (error instanceof FirestorePermissionError) {
      // It's common for this to fail on an empty collection with restrictive read rules.
      // We can treat this as "no data" and let the client uploader show up.
      console.log("Permission error on initial server fetch, likely an empty collection. Defaulting to empty data.");
      initialData = [];
    } else {
      console.error("Failed to fetch initial data on server:", error);
      // We'll pass an empty array and let the client-side try again.
      // Alternatively, you could render an error state.
      initialData = [];
      errorLoading = "Não foi possível carregar os dados iniciais.";
    }
  }

  // The StudentManager component is a Client Component that will handle all interactivity.
  return <StudentManager initialData={initialData} />;
}
