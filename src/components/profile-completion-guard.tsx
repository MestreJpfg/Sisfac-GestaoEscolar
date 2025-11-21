
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// Pages that do not require a completed profile
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

    const isPageProtected = !UNPROTECTED_PATHS.includes(pathname);
    
    // If we have a user, but their profile is not complete, AND they are trying to access a protected page
    if (user && !userProfile?.profileCompleted && isPageProtected) {
        router.replace('/profile');
    }
  }, [user, userProfile, isUserLoading, isUserProfileLoading, router, pathname]);

  // Combine loading states
  const isLoading = isUserLoading || isUserProfileLoading;
  
  // Show a spinner during the initial load of user or profile data.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If the page is protected and the profile is incomplete, a redirect is in progress.
  // Show a loader to prevent flashing content.
  if (user && !userProfile?.profileCompleted && !UNPROTECTED_PATHS.includes(pathname)) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If all checks pass, render the children.
  return <>{children}</>;
}
