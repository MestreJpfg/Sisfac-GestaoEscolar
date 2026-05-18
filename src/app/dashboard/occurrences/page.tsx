
'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldAlert, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import OccurrenceManager from '@/components/occurrence-manager';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function OccurrencesPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

    const profileDocRef = useMemoFirebase(() => {
        if (!userProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', userProfile.profileId);
    }, [userProfile, firestore]);
    const { data: profileDetails, isLoading: isProfileDetailsLoading } = useDoc(profileDocRef);

    const isPermissionsLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading;

    const canManageOccurrences = useMemo(() => {
        if (isPermissionsLoading || !userProfile || !firestore) return false;
        
        if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') {
            return true;
        }
        
        const hasCustomPermission = userProfile.customPermissions?.includes('manage:occurrences');
        const hasProfilePermission = profileDetails?.permissions?.['manage:occurrences'] === true;
        
        return hasCustomPermission || hasProfilePermission;
    }, [userProfile, profileDetails, isPermissionsLoading, firestore]);

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
                                <ShieldAlert className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Registro de Ocorrências</h1>
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
                       {isPermissionsLoading ? (
                           <div className="flex h-64 flex-col items-center justify-center space-y-4">
                               <Loader2 className="h-12 w-12 animate-spin text-primary" />
                               <p className="text-muted-foreground">A verificar permissões...</p>
                           </div>
                       ) : canManageOccurrences ? (
                           <OccurrenceManager />
                       ) : (
                           <div className="flex h-96 flex-col items-center justify-center text-center space-y-4">
                               <div className="rounded-full bg-destructive/10 p-6">
                                   <ShieldAlert className="h-16 w-16 text-destructive" />
                               </div>
                               <h2 className="text-2xl font-bold">Acesso Negado</h2>
                               <p className="text-muted-foreground max-w-md">
                                   O seu perfil não tem permissão para gerir o registro de ocorrências. 
                                   Contacte um administrador se acredita que isto é um erro.
                               </p>
                               <Button variant="outline" onClick={() => router.push('/dashboard')}>
                                   Voltar para a Dashboard
                               </Button>
                           </div>
                       )}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
