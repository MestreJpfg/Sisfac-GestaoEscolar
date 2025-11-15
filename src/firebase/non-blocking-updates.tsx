
'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
  WriteBatch,
} from 'firebase/firestore';


/**
 * Initiates a setDoc operation for a document reference.
 * This is non-blocking and uses console.error for permission errors.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  setDoc(docRef, data, options || {}).catch(error => {
    console.error("Firebase setDoc error:", error);
  });
}


/**
 * Initiates an addDoc operation for a collection reference.
 * This is non-blocking and uses console.error for permission errors.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const promise = addDoc(colRef, data);
  promise.catch(error => {
    console.error("Firebase addDoc error:", error);
  });
  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * This is non-blocking and uses console.error for permission errors.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      console.error("Firebase updateDoc error:", error);
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * This is non-blocking and uses console.error for permission errors.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      console.error("Firebase deleteDoc error:", error);
    });
}

/**
 * Commits a WriteBatch and handles permission errors via console.error.
 * @param batch The WriteBatch to commit.
 */
export function commitBatchNonBlocking(batch: WriteBatch, contextPath: string) {
    batch.commit().catch(error => {
        console.error(`Firebase batch commit error on ${contextPath}:`, error);
    });
}
