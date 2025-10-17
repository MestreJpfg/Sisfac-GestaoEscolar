import { initializeFirebase } from "@/firebase";
import { collection, getDocs, query } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// This is a server-side only file.

// Helper function to get all student data for the currently logged-in user.
// NOTE: This is not a Genkit tool. It's a service function that will be
// wrapped by a tool in the flow.
export async function getStudentData() {
  const { firestore } = initializeFirebase();
  const auth = getAuth();

  // We need to wait for auth to be ready to get the current user.
  // This is a simple way to do it. A more robust solution would be to
  // handle the case where the user is not logged in.
  await new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        resolve();
        unsubscribe();
      }
      // If no user, this will hang, which is fine for this specific use case
      // as the app ensures an anonymous user is always available.
    });
  });

  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated to fetch student data.");
  }

  try {
    const studentsCollection = collection(firestore, "users", user.uid, "students");
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
