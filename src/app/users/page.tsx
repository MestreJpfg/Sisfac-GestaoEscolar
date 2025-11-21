
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
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 1. Get the current user's profile
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc(userDocRef);
    
    // 2. Get the details of that user's role/profile
    const profileDocRef = useMemoFirebase(() => {
        if (!userProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', userProfile.profileId);
      }, [userProfile, firestore]);
    const { data: profileDetails, isLoading: isProfileDetailsLoading, error: profileDetailsError } = useDoc(profileDocRef);

    const isPermissionsLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading;

    // 3. Determine if the user has permission, only after all data is loaded
    const canManageUsers = useMemo(() => {
        if (isPermissionsLoading) return false; // Don't decide until loading is complete
        const profileId = userProfile?.profileId;
        if (profileId === 'Administrador' || profileId === 'Administrador(a)') return true;
        
        const profilePermissions = profileDetails?.permissions || [];
        const customPermissions = userProfile?.customPermissions || [];

        return profilePermissions.includes('manage:users') || customPermissions.includes('manage:users');
    }, [isPermissionsLoading, userProfile, profileDetails]);


    // 4. This effect runs only after loading is complete to check for permissions
    useEffect(() => {
        const anyError = profileError || profileDetailsError;
        // If loading is done and we determined the user can't manage users, redirect.
        if (!isPermissionsLoading && !canManageUsers) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para visualizar esta página.',
            });
            router.replace('/dashboard');
        }
        // Also redirect if there was an error fetching permissions
        if (anyError) {
             toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: `Não foi possível carregar os dados de permissão: ${anyError.message}`,
            });
            router.replace('/dashboard');
        }
    }, [isPermissionsLoading, canManageUsers, profileError, profileDetailsError, router, toast]);

    // Show a loader while checking permissions.
    // Also show loader if we've determined they don't have access, to prevent screen flicker before redirect.
    if (isPermissionsLoading || (!isPermissionsLoading && !canManageUsers)) {
      return (
        <AuthGuard>
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </AuthGuard>
      );
    }
    
    // 5. Render the page content only when all checks have passed.
    // This component will only render if canManageUsers is true.
    return <UsersPageContent />;
}


// Separate component that only renders (and thus queries) when permissions are confirmed.
function UsersPageContent() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    // These queries are now safe to run because this component only renders
    // after the parent component confirms the user has `manage:users` permission.
    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore]);
    
    const profilesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'), orderBy('name'));
    }, [firestore]);

    const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection(usersQuery);
    const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useCollection(profilesQuery);

    // Handle potential data fetching errors after permission is granted
     useEffect(() => {
        const error = usersError || profilesError;
        if (error) {
            console.error("Firestore Permission Error:", error.message);
            toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: 'Não foi possível carregar os dados necessários. Verifique as suas permissões.',
            });
            router.replace('/dashboard');
        }
    }, [usersError, profilesError, router, toast]);

    const isLoading = isLoadingUsers || isLoadingProfiles;

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
                        {isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        ) : (
                           users && profiles && <UserManager initialUsers={users} allProfiles={profiles} />
                        )}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
