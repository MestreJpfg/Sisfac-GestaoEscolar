'use client';

import { useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
    const router = useRouter();
    const { user: currentUser, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // 1. Get current user's profile
    const currentUserDocRef = useMemoFirebase(() => {
        if (!currentUser || !firestore) return null;
        return doc(firestore, 'users', currentUser.uid);
    }, [currentUser, firestore]);
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserDocRef);

    // 2. Get the details of that profile (for permissions)
    const profileDocRef = useMemoFirebase(() => {
        if (!currentUserProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', currentUserProfile.profileId);
    }, [currentUserProfile, firestore]);
    const { data: profileDetails, isLoading: isProfileDetailsLoading } = useDoc(profileDocRef);

    // 3. Determine authorization state: true, false, or null (loading)
    const isAuthorized = useMemo(() => {
        const isLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading;
        if (isLoading) return null; // Important: null signifies loading state

        if (!currentUserProfile) return false;
        
        const isAdmin = currentUserProfile.profileId === 'Administrador';
        const hasExplicitPermission = profileDetails?.permissions?.includes('manage:users') || currentUserProfile?.customPermissions?.includes('manage:users');
        
        return isAdmin || hasExplicitPermission;
    }, [isUserLoading, isProfileLoading, isProfileDetailsLoading, currentUserProfile, profileDetails]);


    // 4. Fetch users ONLY if authorized
    const usersQuery = useMemoFirebase(() => {
        if (isAuthorized !== true) return null; // Don't even create the query unless authorized
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore, isAuthorized]);
    const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);
    
    // 5. Redirect ONLY when authorization is definitively false
    useEffect(() => {
        if (isAuthorized === false) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para aceder a esta página.',
            });
            router.replace('/dashboard');
        }
    }, [isAuthorized, router, toast]);

    // Show a loading screen while checking permissions or fetching users
    const isLoading = isAuthorized === null || (isAuthorized === true && isUsersLoading);

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
                            <div className="flex h-64 w-full items-center justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                       ) : isAuthorized === true && users ? (
                            <UserManager initialUsers={users} />
                       ) : null}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
