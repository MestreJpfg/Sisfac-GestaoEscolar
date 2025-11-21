
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
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);
    
    // 2. Get the details of that user's role/profile
    const profileDocRef = useMemoFirebase(() => {
        if (!userProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', userProfile.profileId);
      }, [userProfile, firestore]);
    const { data: profileDetails, isLoading: isProfileDetailsLoading } = useDoc(profileDocRef);

    const isPermissionsLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading;

    // 3. Determine if the user has permission, only after all data is loaded
    const canManageUsers = useMemo(() => {
        if (isPermissionsLoading) return false;
        if (userProfile?.profileId === 'Administrador' || userProfile?.profileId === 'Administrador(a)') return true;
        return profileDetails?.permissions?.includes('manage:users') || userProfile?.customPermissions?.includes('manage:users');
    }, [isPermissionsLoading, profileDetails, userProfile]);

    const hasFinishedFirstLoad = !isPermissionsLoading;

    // 4. Only create queries if user has permission.
    const usersQuery = useMemoFirebase(() => {
        // Wait for permission check and ensure user can manage users
        if (!hasFinishedFirstLoad || !canManageUsers || !firestore) return null;
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [hasFinishedFirstLoad, canManageUsers, firestore]);
    
    const profilesQuery = useMemoFirebase(() => {
        if (!hasFinishedFirstLoad || !canManageUsers || !firestore) return null;
        return query(collection(firestore, 'profiles'), orderBy('name'));
    }, [hasFinishedFirstLoad, canManageUsers, firestore]);

    const { data: users, isLoading: isLoadingUsers, error: usersError } = useCollection(usersQuery);
    const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useCollection(profilesQuery);

    const isLoading = isPermissionsLoading || isLoadingUsers || isLoadingProfiles;
    const error = usersError || profilesError;
    
    // 5. This effect runs only after loading is complete or if an error is caught.
    useEffect(() => {
        if (hasFinishedFirstLoad && !canManageUsers) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para visualizar esta página.',
            });
            router.replace('/dashboard');
        } else if (error) {
            console.error("Firestore Permission Error:", error.message);
            toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: 'Não foi possível carregar os dados necessários. Verifique as suas permissões.',
            });
            router.replace('/dashboard');
        }
    }, [hasFinishedFirstLoad, canManageUsers, error, router, toast]);

    // Show a loader while checking permissions or loading data.
    if (isLoading || !hasFinishedFirstLoad || (hasFinishedFirstLoad && !canManageUsers)) {
      return (
        <AuthGuard>
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </AuthGuard>
      );
    }
    
    // 6. Render the page only when all checks have passed and data is available.
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
                        {users && profiles && <UserManager initialUsers={users} allProfiles={profiles} />}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
