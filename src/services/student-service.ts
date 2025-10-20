import { initializeFirebase } from "@/firebase";
import { collection, getDocs, query } from "firebase/firestore";

// This is a server-side only file.

// Helper function to get all student data.
// NOTE: This is not a Genkit tool. It's a service function that will be
// wrapped by a tool in the flow.
export async function getStudentData() {
  const { firestore } = initializeFirebase();

  try {
    const studentsCollection = collection(firestore, "students");
    const q = query(studentsCollection);
    const querySnapshot = await getDocs(q);

    const studentsData: any[] = [];
    querySnapshot.forEach((doc) => {
      studentsData.push({ id: doc.id, ...doc.data() });
    });
    
    return studentsData;
  } catch (error) {
    console.error("Error fetching student data from Firestore:", error);
    // It's better to return an empty array or handle the error gracefully
    // than to let the entire flow fail.
    return [];
  }
}
