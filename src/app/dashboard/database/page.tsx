
'use client';

import { useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { useToast } from '@/hooks/use-toast';
import DatabaseManager from '@/components/database-manager';

export default function DatabasePage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    // Memoize the user document reference
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    // Get the user's profile data
    const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc(userDocRef);

    // Determine if initial data loading is complete
    const hasFinishedFirstLoad = !isUserLoading && !isProfileLoading;
    
    // Determine admin status only after all data is loaded to avoid race conditions
    const isAdmin = useMemo(() => {
        if (!hasFinishedFirstLoad || !userProfile?.profileId) return false; 
        const profileId = userProfile.profileId;
        // Check for both variations of the admin profile name
        return profileId === 'Administrador' || profileId === 'Administrador(a)';
    }, [hasFinishedFirstLoad, userProfile]);

    // This effect handles authorization and errors *after* loading is complete
    useEffect(() => {
        if (hasFinishedFirstLoad) {
            // If loading is finished and the user is NOT an admin, redirect them
            if (!isAdmin) {
                toast({
                    variant: 'destructive',
                    title: 'Acesso Negado',
                    description: 'Não tem permissão para aceder a esta página.',
                });
                router.replace('/dashboard');
            }
        }
        // Handle direct permission errors from Firestore (e.g., rules deny reading own user doc)
        if (profileError) {
             toast({
                variant: 'destructive',
                title: 'Erro de Permissão',
                description: 'Não foi possível verificar as suas credenciais de acesso.',
            });
            router.replace('/dashboard');
        }

    }, [hasFinishedFirstLoad, isAdmin, profileError, router, toast]);

    // Show a loader while permissions are being verified or if the user is not an admin (avoids flicker before redirect)
    if (!hasFinishedFirstLoad || (hasFinishedFirstLoad && !isAdmin)) {
      return (
        <AuthGuard>
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        </AuthGuard>
      );
    }
    
    // Only render the full page if loading is done AND the user is confirmed to be an admin
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
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão da Base de Dados</h1>
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
                       <DatabaseManager />
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
