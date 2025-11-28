
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the initial loading is finished.
    if (!isUserLoading) {
      // If loading is done and there's still no user, redirect to login.
      if (!user) {
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // If the user is still loading, show the spinner and nothing else.
  // This prevents children from rendering and making premature Firestore calls.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If loading is finished and we have a user, render the children.
  // The useEffect above handles the no-user case.
  if (user) {
    return <>{children}</>;
  }

  // If loading is finished and there's no user, we are about to redirect,
  // so render the loader to avoid a flash of content from the children.
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
