
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppUser } from '@/lib/user';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

const GlobalLoader = () => (
  <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
    <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
    <h1 className="text-lg font-semibold">A carregar...</h1>
    <p className="text-sm text-muted-foreground">A verificar autenticação.</p>
  </div>
);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    appUser: null,
    isUserLoading: true,
    userError: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const appUser = userDoc.exists() ? (userDoc.data() as AppUser) : null;
          setUserAuthState({ user: firebaseUser, appUser, isUserLoading: false, userError: null });
        } catch (error) {
          console.error("FirebaseProvider: Error fetching user document:", error);
          setUserAuthState({ user: firebaseUser, appUser: null, isUserLoading: false, userError: error as Error });
        }
      } else {
        setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: null });
      }
    }, (error) => {
      console.error("FirebaseProvider: onAuthStateChanged error:", error);
      setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: error });
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
    user: userAuthState.user,
    appUser: userAuthState.appUser,
    isUserLoading: userAuthState.isUserLoading,
  }), [firebaseApp, firestore, auth, userAuthState]);

  const isAuthPage = pathname === '/' || pathname === '/signup';

  useEffect(() => {
    // Don't do anything while loading
    if (userAuthState.isUserLoading) return;

    // If not logged in and not on an auth page, redirect to login
    if (!userAuthState.user && !isAuthPage) {
      router.push('/');
    }

    // If logged in and on an auth page, redirect to dashboard
    if (userAuthState.user && isAuthPage) {
      router.push('/dashboard');
    }
  }, [userAuthState.isUserLoading, userAuthState.user, isAuthPage, pathname, router]);

  // Render decisions
  if (userAuthState.isUserLoading) {
    return <GlobalLoader />;
  }

  if (userAuthState.userError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-destructive-foreground">
        <h1 className="text-lg font-semibold">Erro de Autenticação</h1>
        <p className="text-sm">{userAuthState.userError.message}</p>
      </div>
    );
  }
  
  // If user is not logged in and is on an auth page, show the page
  if (!userAuthState.user && isAuthPage) {
      return (
          <FirebaseContext.Provider value={contextValue}>
            <FirebaseErrorListener />
            {children}
          </FirebaseContext.Provider>
      );
  }
  
  // If user is logged in and not on an auth page, show the page
  if (userAuthState.user && !isAuthPage) {
       return (
          <FirebaseContext.Provider value={contextValue}>
            <FirebaseErrorListener />
            {children}
          </FirebaseContext.Provider>
      );
  }

  // In any other case (like redirecting), show the loader
  return <GlobalLoader />;
};

export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = () => {
    const { user, appUser, isUserLoading } = useFirebase();
    return { user, appUser, isUserLoading };
};
