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
    if (error.code === 'permission-denied') {
      throw new FirestorePermissionError({
        path: studentsCollection.path,
        operation: 'list',
      });
    }
    // For other errors, re-throw them as is.
    throw error;
  }
}
