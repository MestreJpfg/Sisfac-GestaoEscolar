'use client';

import { useEffect } from 'react';
import { useFcm } from '@/hooks/use-fcm';

/**
 * An invisible component that manages the FCM service worker registration.
 * It's main purpose now is to ensure the service worker is ready.
 */
export function FcmTokenManager() {
  const { registerServiceWorker } = useFcm();

  useEffect(() => {
    // We only want to run this on the client
    if (typeof window !== 'undefined') {
      registerServiceWorker();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // This component does not render anything
  return null;
}
