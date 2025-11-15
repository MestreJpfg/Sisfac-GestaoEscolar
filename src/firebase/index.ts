
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// This function initializes and returns the Firebase app instance.
function initializeFirebaseApp(): FirebaseApp {
    if (getApps().length) {
        return getApp();
    }
    return initializeApp(firebaseConfig);
}

export const firebaseApp = initializeFirebaseApp();
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);


export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
