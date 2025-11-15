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
  areServicesAvailable: boolean; 
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  user: User | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  appUser: AppUser | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface UserHookResult {
  user: User | null;
  appUser: AppUser | null;
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
        if (firebaseUser) {
          try {
            const userDocRef = doc(firestore, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserAuthState({ user: firebaseUser, appUser: userDoc.data() as AppUser, isUserLoading: false, userError: null });
            } else {
              // This can happen during signup before the Firestore doc is created.
              // Keep loading until the doc is available or a timeout.
              // For simplicity, we'll assume it exists for now but handle the "not found" case.
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
    // Wait until loading is complete before doing any redirection
    if (contextValue.isUserLoading) {
      return;
    }

    // If there is no user and we are not on an auth page, redirect to login
    if (!contextValue.user && !isAuthPage) {
      router.push('/');
    }

    // If there is a user and we are on an auth page, redirect to dashboard
    if (contextValue.user && isAuthPage) {
      router.push('/dashboard');
    }
  }, [contextValue.isUserLoading, contextValue.user, isAuthPage, router]);

  // Handle auth errors
  if (userAuthState.userError) {
     return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-destructive-foreground">
        <h1 className="text-lg font-semibold">Erro de Autenticação</h1>
        <p className="text-sm">{userAuthState.userError.message}</p>
      </div>
    );
  }
  
  // Show loader while loading or if a redirect is imminent.
  const needsToShowLoader = contextValue.isUserLoading || 
                            (!contextValue.user && !isAuthPage) || 
                            (contextValue.user && isAuthPage);

  if (needsToShowLoader) {
    return <GlobalLoader />;
  }
  
  // If we are on an auth page without a user, or on a protected page with a user, render children
  const canRenderChildren = (!contextValue.user && isAuthPage) || (contextValue.user && !isAuthPage);

  if (canRenderChildren) {
      return (
      <FirebaseContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
    );
  }

  // Fallback to loader, this state should be brief
  return <GlobalLoader />;
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
