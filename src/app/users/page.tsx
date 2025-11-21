
'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';


export default function UsersPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user, isUserLoading: isAuthLoading } = useUser();

    // 1. Get current user's profile
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

    // 2. Get the details of that profile (for permissions)
    const profileDocRef = useMemoFirebase(() => {
        if (!userProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', userProfile.profileId);
    }, [userProfile, firestore]);
    const { data: profileDetails, isLoading: isProfileDetailsLoading } = useDoc(profileDocRef);

    // This state ensures we only check permissions after the initial auth/profile load.
    const hasFinishedFirstLoad = !isAuthLoading && !isProfileLoading && !isProfileDetailsLoading;

    // 3. Determine if the user has permission, only after everything has loaded
    const canManageUsers = useMemo(() => {
        if (!hasFinishedFirstLoad) return undefined; // Return undefined while loading
        if (userProfile?.profileId === 'Administrador') return true;
        
        // Ensure permissions arrays exist before checking
        const profilePermissions = profileDetails?.permissions || [];
        const userPermissions = userProfile?.customPermissions || [];
        
        return profilePermissions.includes('manage:users') || userPermissions.includes('manage:users');
    }, [hasFinishedFirstLoad, userProfile, profileDetails]);


    // 4. Only create the query if the user has permission
    const usersQuery = useMemoFirebase(() => {
        if (!firestore || !canManageUsers) return null; // Important: Query is null if no permission
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore, canManageUsers]);
    
    const profilesQuery = useMemoFirebase(() => {
        // This query is safe as all authenticated users can read profiles
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'), orderBy('name'));
    }, [firestore]);

    const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection(usersQuery);
    const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useCollection(profilesQuery);

    const error = usersError || profilesError;
    const isLoading = isLoadingUsers || isLoadingProfiles;
    
    // Redirect if there's a permission error or if auth has loaded and user is not permitted
    useEffect(() => {
        // Only run the effect if we have a definitive permission status (true or false)
        if (canManageUsers === false) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para gerir utilizadores.',
            });
            router.replace('/dashboard');
        } else if (error) {
            // This will catch the Firestore permission error from the hook
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Ocorreu um erro de permissão ao carregar os dados.',
            });
            router.replace('/dashboard');
        }
    }, [canManageUsers, error, router, toast]);

    // Show a loader while we determine permission status or load data.
    // If canManageUsers is undefined, it means we're still loading permission data.
    if (canManageUsers === undefined || (canManageUsers && isLoading)) {
      return (
        <AuthGuard>
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </AuthGuard>
      );
    }

    // After loading, if permission is definitively false, this component will trigger the redirect
    // but we show a loader to avoid a flash of content.
    if (!canManageUsers) {
      return (
        <AuthGuard>
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </AuthGuard>
      );
    }
    
    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Utilizadores</h1>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end space-x-4">
                            <nav className="flex items-center space-x-1">
                                <ThemeToggle />
                                <UserNav />
                            </nav>
                        </div>
                    </div>
                </header>

                <main className="flex-1 py-8">
                    <div className="container">
                    {/* Render only when data is ready and authorized */}
                    {users && profiles && <UserManager initialUsers={users} allProfiles={profiles} />}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
