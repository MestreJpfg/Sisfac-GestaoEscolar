'use client';

import { useEffect } from 'react';
import { useFcm } from '@/hooks/use-fcm';
import { useUser, useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

/**
 * An invisible component that manages the FCM token lifecycle.
 * It requests permission on mount and stores the token in Firestore.
 */
export function FcmTokenManager() {
  const { requestPermissionAndGetToken } = useFcm();
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    // This function will be called once on component mount
    const initFcm = async () => {
      // requestPermissionAndGetToken already checks if messaging is available
      const token = await requestPermissionAndGetToken();

      if (token && user && firestore) {
        // Save the token to Firestore under the user's document
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          await setDoc(userDocRef, { fcmTokens: { [token]: true } }, { merge: true });
          console.log('FCM token saved to Firestore.');
        } catch (error) {
          console.error('Error saving FCM token to Firestore:', error);
        }
      }
    };
    
    // We only want to run this on the client
    if (typeof window !== 'undefined') {
      initFcm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore]); // Re-run if user or firestore instance changes

  // This component does not render anything
  return null;
}
