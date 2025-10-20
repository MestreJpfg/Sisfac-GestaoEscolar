
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
  writeBatch,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Initiates a setDoc operation for a document reference.
 * This is non-blocking and uses the error emitter for permission errors.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options?: SetOptions) {
  const operation = options && 'merge' in options ? 'update' : 'create';
  setDoc(docRef, data, options || {})
    .catch(error => {
      // Assuming permission error, create and emit the contextual error
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: operation,
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  // Execution continues immediately
}


/**
 * Initiates an addDoc operation for a collection reference.
 * This is non-blocking and uses the error emitter for permission errors.
 * Returns the Promise for the new doc ref, but typically not awaited by caller.
 */
export function addDocumentNonBlocking(colRef: CollectionReference, data: any): Promise<DocumentReference> {
  const promise = addDoc(colRef, data);
  
  promise.catch(error => {
      const permissionError = new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
  });

  return promise;
}


/**
 * Initiates an updateDoc operation for a document reference.
 * This is non-blocking and uses the error emitter for permission errors.
 */
export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data)
    .catch(error => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: data,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}


/**
 * Initiates a deleteDoc operation for a document reference.
 * This is non-blocking and uses the error emitter for permission errors.
 */
export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef)
    .catch(error => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
}

/**
 * Commits a WriteBatch and handles permission errors via the global emitter.
 * @param batch The WriteBatch to commit.
 * @param contextPath A representative path for the batch operation (e.g., collection path).
 */
export function commitBatchNonBlocking(batch: WriteBatch, contextPath: string) {
    batch.commit().catch(error => {
        // Batch errors don't give specific document info, so we use a general context.
        const permissionError = new FirestorePermissionError({
            path: contextPath,
            operation: 'write', // 'write' is a generic term for batch operations
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}
