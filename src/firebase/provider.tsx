'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppUser as UserProfile } from '@/lib/user';


interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  appUser: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseContextState {
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  user: User | null;
  appUser: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  appUser: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  appUser: UserProfile | null;
  isUserLoading: boolean;
  userError: Error | null;
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
    if (!auth || !firestore) {
      setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided.") });
      return;
    }
  
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setUserAuthState(prevState => ({ ...prevState, isUserLoading: true }));
        if (firebaseUser) {
          try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserAuthState({ user: firebaseUser, appUser: userDoc.data() as UserProfile, isUserLoading: false, userError: null });
            } else {
              setUserAuthState({ user: firebaseUser, appUser: null, isUserLoading: false, userError: null });
            }
          } catch (error) {
            console.error("FirebaseProvider: Error fetching user document:", error);
            setUserAuthState({ user: firebaseUser, appUser: null, isUserLoading: false, userError: error as Error });
          }
        } else {
          setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, appUser: null, isUserLoading: false, userError: error });
      }
    );
  
    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => ({
    areServicesAvailable: !!(firebaseApp && firestore && auth),
    firebaseApp: firebaseApp,
    firestore: firestore,
    auth: auth,
    ...userAuthState,
  }), [firebaseApp, firestore, auth, userAuthState]);
  
  const isAuthPage = pathname === '/' || pathname === '/signup';

  useEffect(() => {
    // Don't do anything while auth state is loading
    if (userAuthState.isUserLoading) {
      return;
    }

    // If user is not logged in and not on an auth page, redirect to login
    if (!userAuthState.user && !isAuthPage) {
      router.push('/');
    }

    // If user is logged in and on an auth page, redirect to dashboard
    if (userAuthState.user && isAuthPage) {
      router.push('/dashboard');
    }
  }, [userAuthState.isUserLoading, userAuthState.user, isAuthPage, router, pathname]);

  // While loading, or if a redirect is needed but hasn't happened yet, show a global loader.
  if (userAuthState.isUserLoading || (!userAuthState.user && !isAuthPage) || (userAuthState.user && isAuthPage)) {
    return <GlobalLoader />;
  }

  // Handle auth errors
  if (userAuthState.userError) {
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-destructive-foreground">
        <h1 className="text-lg font-semibold">Erro de Autenticação</h1>
        <p className="text-sm">{userAuthState.userError.message}</p>
      </div>
    );
  }
  
  // Render children only when the auth state is stable and the user is on the correct page.
  return (
      <FirebaseContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    appUser: context.appUser,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
  const { user, appUser, isUserLoading, userError } = useFirebase();
  return { user, appUser, isUserLoading, userError };
};
