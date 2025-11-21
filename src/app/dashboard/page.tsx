
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, Users, UserCog, Shield, Database, ClipboardList, BookCopy } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import AppFooter from '@/components/app-footer';


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

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

  const hasPermission = (permission: string) => {
    if (isPermissionsLoading || !userProfile || !firestore) return false;
    
    if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') {
      return true;
    }
    
    if (profileDetails?.permissions?.includes(permission)) {
      return true;
    }
    
    if (userProfile.customPermissions?.includes(permission)) {
      return true;
    }

    return false;
  };
  
  const canManageUsers = useMemo(() => {
    if (isPermissionsLoading) return false;
    return hasPermission('manage:users');
  }, [isPermissionsLoading, userProfile, profileDetails]);
  
  const canManageProfiles = useMemo(() => {
    if (isPermissionsLoading) return false;
    return hasPermission('manage:profiles');
  }, [isPermissionsLoading, userProfile, profileDetails]);

  const canViewStudents = useMemo(() => {
     if (isPermissionsLoading) return false;
    return hasPermission('manage:students') || hasPermission('view:students');
  }, [isPermissionsLoading, userProfile, profileDetails]);

  const canManageSubjects = useMemo(() => {
    if (isPermissionsLoading) return false;
    return hasPermission('manage:subjects');
  }, [isPermissionsLoading, userProfile, profileDetails]);

  const isAdmin = useMemo(() => {
    if (isPermissionsLoading) return false;
    return userProfile?.profileId === 'Administrador' || userProfile?.profileId === 'Administrador(a)';
  }, [isPermissionsLoading, userProfile]);


  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !canViewStudents) return null;
    return query(collection(firestore, 'alunos'));
  }, [firestore, canViewStudents]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !canManageUsers) return null; 
    return query(collection(firestore, 'users'));
  }, [firestore, canManageUsers]);
  
  const profilesQuery = useMemoFirebase(() => {
    if (!firestore || !canManageProfiles) return null;
    return query(collection(firestore, 'profiles'));
  }, [firestore, canManageProfiles]);


  const { data: students, isLoading: isStudentsLoading } = useCollection(studentsQuery);
  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);
  const { data: profiles, isLoading: isProfilesLoading } = useCollection(profilesQuery);


  const welcomeName = user?.displayName?.split(' ')[0] || 'Utilizador';

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const shouldCompleteProfile = userProfile && !userProfile.profileCompleted;
  
  if (shouldCompleteProfile) {
    router.replace('/profile');
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
                    <div className="flex items-center gap-2">
                        <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                        <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão Escolar</h1>
                    </div>
                    <div className="flex flex-1 items-center justify-end space-x-4">
                        <nav className="flex items-center space-x-1">
                            <ThemeToggle />
                            <UserNav />
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1">
            <div className="container py-8">
                <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bem-vindo(a), {welcomeName}!</h2>
                <p className="text-muted-foreground">Aqui está um resumo da sua plataforma.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Alunos"
                    value={isStudentsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (students?.length ?? 0)}
                    icon={Users}
                    description="Total de alunos registados"
                    action={<Button onClick={() => router.push('/dashboard/students')}>Gerir Alunos</Button>}
                    />
                    <StatCard
                        title="O meu Perfil"
                        value={user?.displayName ?? ''}
                        icon={UserCog}
                        description="Gerir as suas informações e preferências"
                        action={<Button onClick={() => router.push('/profile')}>Aceder ao Perfil</Button>}
                    />
                     <StatCard
                        title="Turmas"
                        value={"Gerar Listas"}
                        icon={ClipboardList}
                        description="Gerar listas de turmas para impressão"
                        action={<Button onClick={() => router.push('/dashboard/classes')}>Gerir Turmas</Button>}
                        />
                    
                    {isPermissionsLoading ? (
                        <StatCard title="..." value={<Loader2 className="h-5 w-5 animate-spin"/>} icon={Users} />
                    ) : (
                        <>
                            {canManageUsers && (
                                <StatCard
                                title="Utilizadores"
                                value={isUsersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (users?.length ?? 0)}
                                icon={UserCog}
                                description="Total de contas no sistema"
                                action={<Button onClick={() => router.push('/users')}>Gerir Utilizadores</Button>}
                                />
                            )}
                            {canManageProfiles && (
                                <StatCard
                                title="Perfis e Permissões"
                                value={isProfilesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (profiles?.length ?? 0)}
                                icon={Shield}
                                description="Perfis de acesso no sistema"
                                action={<Button onClick={() => router.push('/profiles')}>Gerir Perfis</Button>}
                                />
                            )}
                             {canManageSubjects && (
                                <StatCard
                                title="Disciplinas"
                                value={"Configurar"}
                                icon={BookCopy}
                                description="Gerir as disciplinas do currículo"
                                action={<Button onClick={() => router.push('/dashboard/subjects')}>Gerir Disciplinas</Button>}
                                />
                            )}
                            {isAdmin && (
                                <StatCard
                                title="Gestão da Base de Dados"
                                value={"Ferramentas"}
                                icon={Database}
                                description="Importar, exportar e gerir dados"
                                action={<Button onClick={() => router.push('/dashboard/database')}>Aceder</Button>}
                                />
                            )}
                        </>
                    )}
                </div>

                <div className="mt-8">
                    {/* Futuro espaço para mais componentes, como anúncios ou calendário */}
                </div>
            </div>
            </main>
            <AppFooter />
        </div>
    </AuthGuard>
  );
}
