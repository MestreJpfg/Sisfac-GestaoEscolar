import { collection, getDocs, query, type Firestore } from "firebase/firestore";
import { type DataItem } from "@/components/data-viewer";


// Helper function to get all student data.
// NOTE: This is not a Genkit tool. It's a service function that will be
// wrapped by a tool in the flow.
export async function getStudentData(firestore: Firestore): Promise<DataItem[]> {
  try {
    const studentsCollection = collection(firestore, "students");
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
  } catch (error) {
    console.error("Error fetching student data from Firestore:", error);
    // On error, return an empty array to prevent the app from crashing.
    // This allows the useCollection hook to handle the error state.
    throw error;
  }
}
