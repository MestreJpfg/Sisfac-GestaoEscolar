
'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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

    // Directly query the users collection. The authorization logic is now handled
    // by Firestore Security Rules.
    const usersQuery = useMemo(() => {
        if (!firestore) return null; 
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore]);

    // The useCollection hook will now receive a FirestorePermissionError if the
    // rules deny the 'list' operation.
    const { data: users, isLoading, error } = useCollection(usersQuery);

    // This effect runs when the 'error' state from useCollection changes.
    useEffect(() => {
        if (error) {
            // Firestore rules denied the request. The user is not authorized.
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para aceder a esta página.',
            });
            // Redirect the user back to the dashboard.
            router.replace('/dashboard');
        }
    }, [error, router, toast]);

    // If there is an error, we are about to redirect, so we can show a loader
    // or nothing to prevent a flash of incorrect content.
    if (error) {
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
                       {isLoading ? (
                            <div className="flex h-64 w-full items-center justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                       // If not loading and data is available, show the UserManager.
                       ) : users ? (
                            <UserManager initialUsers={users} />
                       // If not loading and there's no data (and no error), it means the collection is empty.
                       ) : null}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
