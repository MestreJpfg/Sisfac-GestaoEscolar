
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Store singleton instances
let serverApp: FirebaseApp;
let serverFirestore: Firestore;

/**
 * Initializes Firebase for server-side usage (e.g., in Genkit flows).
 * This creates a singleton instance to avoid re-initialization.
 */
function initializeServerFirebase() {
  if (!getApps().some(app => app.name === 'server')) {
    serverApp = initializeApp(firebaseConfig, 'server');
  } else {
    serverApp = getApp('server');
  }
  serverFirestore = getFirestore(serverApp);
}

/**
 * Returns a server-side Firestore instance.
 * Initializes the app if it hasn't been already.
 * @returns {Firestore} The server-side Firestore instance.
 */
export function getFirestoreServer(): Firestore {
  if (!serverFirestore) {
    initializeServerFirebase();
  }
  return serverFirestore;
}
