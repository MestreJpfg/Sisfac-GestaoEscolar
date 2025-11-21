
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const UNPROTECTED_PATHS = ['/profile', '/login', '/signup'];

export default function ProfileCompletionGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isUserProfileLoading } = useDoc(userDocRef);

  useEffect(() => {
    // This guard should only be active after the initial user loading is complete.
    if (isUserLoading || isUserProfileLoading) {
        return;
    }

    // This is the key change: only redirect if the current page is PROTECTED
    // and the profile is incomplete.
    const isPageProtected = !UNPROTECTED_PATHS.includes(pathname);
    
    if (user && !userProfile?.profileCompleted && isPageProtected) {
        // Redirect to /profile only if they are trying to access a protected page
        router.replace('/profile');
    }
    
  }, [user, userProfile, isUserLoading, isUserProfileLoading, router, pathname]);

  // Combine loading states
  const isLoading = isUserLoading || isUserProfileLoading;

  // The guard's main responsibility is to REDIRECT, not to block rendering with a loader
  // if the destination is a protected page and we're just waiting for the profile to load.
  // The AuthGuard already shows a loader.
  // We only show a loader here if a redirect is imminent.
  const isRedirecting = !isLoading && user && !userProfile?.profileCompleted && !UNPROTECTED_PATHS.includes(pathname);
  
  if (isRedirecting) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // In all other cases (loading, or profile is complete, or on an unprotected page),
  // just render the children and let the AuthGuard handle its own loading spinner.
  return <>{children}</>;
}
