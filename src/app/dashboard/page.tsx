
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc, getCountFromServer } from 'firebase/firestore';
import { Loader2, Users, UserCog, Shield, Database, ClipboardList, BookCopy, Archive, MessageSquare, Megaphone } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/auth-guard';
import AppFooter from '@/components/app-footer';


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentCount, setStudentCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [userCount, setUserCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [profileCount, setProfileCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);

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
    
    // This logic must stay in sync with the hasPermission function in firestore.rules
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
  
  const canManageCadastros = useMemo(() => {
    if (isPermissionsLoading) return false;
    return hasPermission('manage:cadastros');
  }, [isPermissionsLoading, userProfile, profileDetails]);

  const canViewStudents = useMemo(() => {
     if (isPermissionsLoading) return false;
    return hasPermission('manage:students') || hasPermission('view:students');
  }, [isPermissionsLoading, userProfile, profileDetails]);
  
   const canManageAnnouncements = useMemo(() => {
    if (isPermissionsLoading) return false;
    return hasPermission('manage:announcements');
  }, [isPermissionsLoading, userProfile, profileDetails]);

  const isAdmin = useMemo(() => {
    if (isPermissionsLoading) return false;
    return userProfile?.profileId === 'Administrador' || userProfile?.profileId === 'Administrador(a)';
  }, [isPermissionsLoading, userProfile]);

  useEffect(() => {
    const fetchCounts = async () => {
        if (!firestore) return;

        try {
            if (canViewStudents) {
                const studentsColl = collection(firestore, 'alunos');
                const studentsSnapshot = await getCountFromServer(query(studentsColl));
                setStudentCount(studentsSnapshot.data().count);
            } else {
                 setStudentCount(0);
            }
        } catch (e) {
            console.error("Error fetching student count: ", e);
            setStudentCount('N/A');
        }

         try {
            if (canManageUsers) {
                const usersColl = collection(firestore, 'users');
                const usersSnapshot = await getCountFromServer(query(usersColl));
                setUserCount(usersSnapshot.data().count);
            } else {
                setUserCount(0);
            }
        } catch (e) {
            console.error("Error fetching user count: ", e);
            setUserCount('N/A');
        }

        try {
            // All authenticated users can list profiles
            const profilesColl = collection(firestore, 'profiles');
            const profilesSnapshot = await getCountFromServer(query(profilesColl));
            setProfileCount(profilesSnapshot.data().count);
        } catch (e) {
            console.error("Error fetching profile count: ", e);
            setProfileCount('N/A');
        }
    };

    if (!isPermissionsLoading) {
      fetchCounts();
    }
  }, [firestore, isPermissionsLoading, canViewStudents, canManageUsers]);


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

            <main className="flex-1 container px-4 sm:px-6 lg:px-8">
            <div className="py-8">
                <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bem-vindo(a), {welcomeName}!</h2>
                <p className="text-muted-foreground">Aqui está um resumo da sua plataforma.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Alunos"
                    value={studentCount}
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
                    <StatCard
                        title="Mural de Mensagens"
                        value={"Avisos"}
                        icon={MessageSquare}
                        description="Ver e publicar mensagens para todos"
                        action={<Button onClick={() => router.push('/dashboard/mural')}>Aceder ao Mural</Button>}
                    />
                    
                    {isPermissionsLoading ? (
                        <StatCard title="..." value={<Loader2 className="h-5 w-5 animate-spin"/>} icon={Users} />
                    ) : (
                        <>
                            {canManageAnnouncements && (
                                <StatCard
                                title="Comunicados"
                                value={"Anúncios"}
                                icon={Megaphone}
                                description="Gerir comunicados para públicos específicos"
                                action={<Button onClick={() => router.push('/dashboard/announcements')}>Aceder</Button>}
                                />
                            )}
                            {canManageCadastros && (
                                <StatCard
                                title="Cadastros"
                                value={"Gerais"}
                                icon={Archive}
                                description="Gerir cadastros gerais do sistema"
                                action={<Button onClick={() => router.push('/dashboard/cadastros')}>Aceder</Button>}
                                />
                            )}
                            {canManageUsers && (
                                <StatCard
                                title="Utilizadores"
                                value={userCount}
                                icon={UserCog}
                                description="Total de contas no sistema"
                                action={<Button onClick={() => router.push('/users')}>Gerir Utilizadores</Button>}
                                />
                            )}
                           {canManageCadastros && (
                                <StatCard
                                title="Perfis e Permissões"
                                value={profileCount}
                                icon={Shield}
                                description="Perfis de acesso no sistema"
                                action={<Button onClick={() => router.push('/profiles')}>Gerir Perfis</Button>}
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
