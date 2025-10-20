import { collection, getDocs, query, type Firestore } from "firebase/firestore";
import { type DataItem } from "@/components/data-viewer";
import { FirestorePermissionError } from "@/firebase/errors";


// Helper function to get all student data.
// NOTE: This is not a Genkit tool. It's a service function that will be
// wrapped by a tool in the flow.
export async function getStudentData(firestore: Firestore): Promise<DataItem[]> {
  const studentsCollection = collection(firestore, "students");
  try {
    const q = query(studentsCollection);
    const querySnapshot = await getDocs(q);

    const studentsData: DataItem[] = [];
    querySnapshot.forEach((doc) => {
      // Cast the document data to fit the DataItem structure
      const data = doc.data();
      const student: DataItem = {
        id: doc.id,
        mainItem: data.mainItem,
        subItems: data.subItems,
      };
      studentsData.push(student);
    });
    
    return studentsData;
  } catch (error: any) {
    // Re-throw the original error. The caller (Server or Client component)
    // will be responsible for interpreting it. We cannot throw a client-side
    // error class from a server-side function.
    throw error;
  }
}
