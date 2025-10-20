
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

  try {
    const studentData = await getStudentData(firestore);
    // Sort data on the server before passing it to the client
    initialData = studentData.sort((a, b) => {
        const nameA = a.mainItem || "";
        const nameB = b.mainItem || "";
        return nameA.localeCompare(nameB);
    });
  } catch (error: any) {
     // This can happen if the collection is empty and has restrictive read rules (allow read if true;).
     // Firestore security rules do not allow listing empty collections if the rule isn't simply `allow read;`.
     // We treat this as "no data" and let the client uploader show up.
     if (error.code === 'permission-denied') {
        console.log("Permission error on initial server fetch, likely an empty collection or restrictive rules. Defaulting to empty data.");
     } else {
        console.error("Failed to fetch initial data on server:", error);
     }
     // In any error case on the server, we'll start with an empty array
     // and let the client-side components decide what to do.
     initialData = [];
  }

  // The StudentManager component is a Client Component that will handle all interactivity.
  return <StudentManager initialData={initialData} />;
}
