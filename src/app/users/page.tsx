
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, ShieldOff } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { useCollection } from '@/firebase/firestore/use-collection';

// Componente principal da página, agora simplificado.
export default function UsersPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();

    // Permissões do utilizador
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

    // Perfis para o filtro
    const profilesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'));
    }, [firestore]);
    const { data: profiles, isLoading: isLoadingProfiles } = useCollection(profilesQuery);

    const isPermissionsLoading = isProfileLoading || isProfileDetailsLoading;

    const hasPermission = (permission: string) => {
        if (isPermissionsLoading || !userProfile || !firestore) return false;
        if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') return true;
        if (permission.startsWith('view:')) {
            const managePermission = permission.replace('view:', 'manage:');
            if (profileDetails?.permissions?.includes(managePermission) || userProfile.customPermissions?.includes(managePermission)) return true;
        }
        return profileDetails?.permissions?.includes(permission) || userProfile.customPermissions?.includes(permission);
    };

    const canViewUsers = useMemo(() => hasPermission('view:users'), [userProfile, profileDetails, isPermissionsLoading]);

    if (isPermissionsLoading || isLoadingProfiles) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!canViewUsers) {
         return (
            <AuthGuard>
                <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
                    <ShieldOff className="h-16 w-16 text-destructive" />
                    <h1 className="mt-4 text-2xl font-bold">Acesso Negado</h1>
                    <p className="mt-2 text-muted-foreground">Não tem permissão para aceder a esta página.</p>
                    <Button className="mt-6" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para a Dashboard
                    </Button>
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
                       <UserManager allProfiles={profiles || []} />
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
