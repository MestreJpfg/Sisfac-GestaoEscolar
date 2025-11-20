'use client';

import { useMemo, useEffect, useState } from 'react';
import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AppFooter from '@/components/app-footer';


export default function UsersPage() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const { user: currentUser, isUserLoading } = useUser();

    // 1. Get the current user's profile
    const currentUserDocRef = useMemoFirebase(() => {
        if (!currentUser || !firestore) return null;
        return doc(firestore, 'users', currentUser.uid);
    }, [currentUser, firestore]);
    const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserDocRef);

    const isAuthorized = currentUserProfile?.profileId === 'Administrador';

    // 2. Only query for all users if authorized
    const usersQuery = useMemo(() => {
        if (!firestore || !isAuthorized) return null;
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore, isAuthorized]);

    const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

    // 3. Redirect if not authorized after loading is complete
    useEffect(() => {
        const doneLoading = !isUserLoading && !isProfileLoading;
        if (doneLoading && !isAuthorized) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para aceder a esta página.',
            });
            router.replace('/dashboard');
        }
    }, [isAuthorized, isUserLoading, isProfileLoading, router, toast]);

    const isLoading = isUserLoading || isProfileLoading || (isAuthorized && isUsersLoading);

    // Render a loading state or nothing while checking permissions
    if (isLoading || !isAuthorized) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
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
                        <UserManager users={users || []} />
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
