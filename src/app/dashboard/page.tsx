'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc } from 'firebase/firestore';
import { Loader2, Users, School, UserCog, Shield } from 'lucide-react';
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

  const studentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'alunos'));
  }, [user, firestore]);

  const usersQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users'));
  }, [user, firestore]);
  
  const profilesQuery = useMemoFirebase(() => {
    if (!firestore || isProfileLoading || !userProfile || userProfile.profileId !== 'Administrador') return null;
    return query(collection(firestore, 'profiles'));
  }, [firestore, userProfile, isProfileLoading]);

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'classes'));
  }, [firestore, user]);

  const { data: students, isLoading: isStudentsLoading } = useCollection(studentsQuery);
  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);
  const { data: profiles, isLoading: isProfilesLoading } = useCollection(profilesQuery);
  const { data: classes, isLoading: isClassesLoading } = useCollection(classesQuery);

  const isLoading = isUserLoading || isProfileLoading;
  const isAdmin = userProfile?.profileId === 'Administrador';
  const isManager = userProfile?.profileId === 'Gestor';
  const welcomeName = user?.displayName?.split(' ')[0] || 'Utilizador';

  if (isLoading) {
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
              <h2 className="text-3xl font-bold tracking-tight">Bem-vindo(a) de volta, {welcomeName}!</h2>
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
                 {(isAdmin || isManager) && (
                    <StatCard
                        title="Turmas"
                        value={isClassesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (classes?.length ?? 0)}
                        icon={School}
                        description="Total de turmas na escola"
                        action={<Button onClick={() => router.push('/dashboard/classes')}>Gerir Turmas</Button>}
                    />
                 )}
                 {isAdmin && (
                  <>
                    <StatCard
                      title="Utilizadores"
                      value={isUsersLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (users?.length ?? 0)}
                      icon={UserCog}
                      description="Total de contas no sistema"
                      action={<Button onClick={() => router.push('/users')}>Gerir Utilizadores</Button>}
                    />
                    <StatCard
                      title="Perfis e Permissões"
                      value={isProfilesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (profiles?.length ?? 0)}
                      icon={Shield}
                      description="Perfis de acesso no sistema"
                      action={<Button onClick={() => router.push('/profiles')}>Gerir Perfis</Button>}
                    />
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
