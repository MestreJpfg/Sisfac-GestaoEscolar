'use client';

import { useEffect } from 'react';
import { useFcm } from '@/hooks/use-fcm';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

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
          // Use non-blocking update to avoid waiting for the write to complete
          updateDocumentNonBlocking(userDocRef, { fcmTokens: { [token]: true } });
          console.log('FCM token queued for saving to Firestore.');
        } catch (error) {
          // This catch block might not be effective for non-blocking calls,
          // as the error happens in the background. The error is handled
          // within the non-blocking update function itself.
          console.error('Error initiating FCM token save to Firestore:', error);
        }
      }
    };
    
    // We only want to run this on the client
    if (typeof window !== 'undefined' && user && firestore) {
      initFcm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, firestore]); // Re-run if user or firestore instance changes

  // This component does not render anything
  return null;
}
