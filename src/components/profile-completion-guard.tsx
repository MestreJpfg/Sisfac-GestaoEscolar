'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// Pages that do not require a completed profile
const UNPROTECTED_PATHS = ['/profile'];

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
    const isPageProtected = !UNPROTECTED_PATHS.includes(pathname);
    
    // Wait until user and profile data are loaded
    if (!isUserLoading && !isUserProfileLoading) {
        // If user has no profile or profile is incomplete, and they are on a protected page
        if (user && !userProfile?.profileCompleted && isPageProtected) {
            router.replace('/profile');
        }
    }
  }, [user, userProfile, isUserLoading, isUserProfileLoading, router, pathname]);

  const isLoading = isUserLoading || isUserProfileLoading;
  
  // While loading, show a spinner to prevent content flashing
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not logged in, AuthGuard will handle it. 
  // If profile is incomplete and we're on a protected page, we are redirecting, so show spinner.
  if (user && !userProfile?.profileCompleted && !UNPROTECTED_PATHS.includes(pathname)) {
     return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Otherwise, render the page content
  return <>{children}</>;
}
