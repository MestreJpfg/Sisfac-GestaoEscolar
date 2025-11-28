
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, doc, getCountFromServer, orderBy } from 'firebase/firestore';
import { Loader2, Users, UserCog, Shield, Database, ClipboardList, Megaphone, CalendarCheck, ArrowLeft, NotebookText } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/auth-guard';
import AppFooter from '@/components/app-footer';
import StudentDistributionChart from '@/components/student-distribution-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import NeeDistributionChart from '@/components/nee-distribution-chart';


export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentCount, setStudentCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [userCount, setUserCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [profileCount, setProfileCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [chartDrilldown, setChartDrilldown] = useState<string | null>(null);

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
  
  const studentsQuery = useMemo(() => {
      if (!firestore) return null;
      // Filtra alunos que não têm a propriedade 'serie' ou cujo valor é vazio/nulo
      return query(collection(firestore, 'alunos'), orderBy('nome'));
  }, [firestore]);
  const { data: allStudents, isLoading: isLoadingAllStudents } = useCollection(studentsQuery);

  const isPermissionsLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading;

  const hasPermission = (permission: string) => {
    if (isPermissionsLoading || !userProfile || !firestore) return false;
    
    if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') {
      return true;
    }
    
    // Check for "manage" permission which implies "view"
    if (permission.startsWith('view:')) {
        const managePermission = permission.replace('view:', 'manage:');
        if (profileDetails?.permissions?.includes(managePermission) || userProfile.customPermissions?.includes(managePermission)) {
            return true;
        }
    }
    
    if (profileDetails?.permissions?.includes(permission)) {
      return true;
    }
    
    if (userProfile.customPermissions?.includes(permission)) {
      return true;
    }

    return false;
  };
  
  const canViewStudents = useMemo(() => hasPermission('view:students'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageStudents = useMemo(() => hasPermission('manage:students'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewUsers = useMemo(() => hasPermission('view:users'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageUsers = useMemo(() => hasPermission('manage:users'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewProfiles = useMemo(() => hasPermission('view:profiles'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageProfiles = useMemo(() => hasPermission('manage:profiles'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewAnnouncements = useMemo(() => hasPermission('view:announcements'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageAnnouncements = useMemo(() => hasPermission('manage:announcements'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewAttendance = useMemo(() => hasPermission('view:attendance'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageAttendance = useMemo(() => hasPermission('manage:attendance'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewDatabase = useMemo(() => hasPermission('view:database'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageDatabase = useMemo(() => hasPermission('manage:database'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewGrades = useMemo(() => hasPermission('view:grades'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageGrades = useMemo(() => hasPermission('manage:grades'), [userProfile, profileDetails, isPermissionsLoading]);


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
            if (canViewUsers) {
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
            if (canViewProfiles) {
              const profilesColl = collection(firestore, 'profiles');
              const profilesSnapshot = await getCountFromServer(query(profilesColl));
              setProfileCount(profilesSnapshot.data().count);
            } else {
              setProfileCount(0);
            }
        } catch (e) {
            console.error("Error fetching profile count: ", e);
            setProfileCount('N/A');
        }
    };

    if (!isPermissionsLoading) {
      fetchCounts();
    }
  }, [firestore, isPermissionsLoading, canViewStudents, canViewUsers, canViewProfiles]);


  const welcomeName = user?.displayName?.split(' ')[0] || 'Utilizador';

  if (isUserLoading || isProfileLoading) {
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

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {canViewStudents && (
                    <StatCard
                        title="Alunos"
                        value={studentCount}
                        icon={Users}
                        description="Total de alunos registados"
                        action={canManageStudents ? <Button onClick={() => router.push('/dashboard/students')}>Gerir Alunos</Button> : undefined}
                    />
                  )}
                  <StatCard
                      title="O meu Perfil"
                      value={user?.displayName ?? ''}
                      icon={UserCog}
                      description="Gerir as suas informações e preferências"
                      action={<Button onClick={() => router.push('/profile')}>Aceder ao Perfil</Button>}
                  />
                  {canViewStudents && (
                    <StatCard
                        title="Turmas"
                        value={"Gerar Listas"}
                        icon={ClipboardList}
                        description="Gerar listas de turmas para impressão"
                        action={<Button onClick={() => router.push('/dashboard/classes')}>Gerir Turmas</Button>}
                    />
                  )}
                  
                  {isPermissionsLoading ? (
                      <StatCard title="..." value={<Loader2 className="h-5 w-5 animate-spin"/>} icon={Users} />
                  ) : (
                      <>
                          {(canViewAttendance || canManageAttendance) && (
                            <StatCard
                                title="Registo de Frequência"
                                value={"Chamada"}
                                icon={CalendarCheck}
                                description="Registar a frequência diária dos alunos"
                                action={<Button onClick={() => router.push('/dashboard/attendance')}>Aceder</Button>}
                            />
                           )}
                          {(canViewGrades || canManageGrades) && (
                            <StatCard
                                title="Gestão de Notas"
                                value={"Boletins"}
                                icon={NotebookText}
                                description="Lançar e gerir notas e boletins"
                                action={<Button onClick={() => router.push('/dashboard/grades')}>Aceder</Button>}
                            />
                           )}
                          {(canViewAnnouncements || canManageAnnouncements) && (
                              <StatCard
                              title="Comunicados"
                              value={"Anúncios"}
                              icon={Megaphone}
                              description="Gerir comunicados para públicos específicos"
                              action={<Button onClick={() => router.push('/dashboard/announcements')}>Aceder</Button>}
                              />
                          )}
                          {canViewUsers && (
                              <StatCard
                              title="Utilizadores"
                              value={userCount}
                              icon={UserCog}
                              description="Total de contas no sistema"
                              action={canManageUsers ? <Button onClick={() => router.push('/users')}>Gerir Utilizadores</Button> : undefined}
                              />
                          )}
                          {canViewProfiles && (
                            <>
                              <StatCard
                                title="Perfis e Permissões"
                                value={profileCount}
                                icon={Shield}
                                description="Perfis de acesso no sistema"
                                action={canManageProfiles ? <Button onClick={() => router.push('/profiles')}>Gerir Perfis</Button> : undefined}
                              />
                            </>
                          )}
                           {(canViewDatabase || canManageDatabase) && (
                            <StatCard
                              title="Gestão da Base de Dados"
                              value={"Ferramentas"}
                              icon={Database}
                              description="Importar, exportar e gerir dados"
                              action={canManageDatabase ? <Button onClick={() => router.push('/dashboard/database')}>Aceder</Button> : undefined}
                            />
                          )}
                      </>
                  )}
                </div>

                {canViewStudents && (
                  <div className="mt-8 grid gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                <CardTitle>
                                    {chartDrilldown ? `Detalhes de ${chartDrilldown}` : 'Distribuição de Alunos por Série'}
                                </CardTitle>
                                <CardDescription>
                                    {chartDrilldown ? `Total de alunos por turma e turno (${(allStudents || []).filter(s => s.serie === chartDrilldown).length || 0} alunos).` : 'Clique duplo numa barra para ver os detalhes da série.'}
                                </CardDescription>
                                </div>
                                {chartDrilldown && (
                                    <Button variant="outline" size="sm" onClick={() => setChartDrilldown(null)}>
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Voltar
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pl-2">
                            {isLoadingAllStudents ? (
                                <div className="flex h-[350px] w-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <StudentDistributionChart 
                                    students={allStudents || []}
                                    onDrilldown={setChartDrilldown}
                                    drilledSerie={chartDrilldown}
                                />
                            )}
                        </CardContent>
                    </Card>
                    <NeeDistributionChart students={allStudents || []} isLoading={isLoadingAllStudents} />
                  </div>
                )}
            </div>
            </main>
            <AppFooter />
        </div>
    </AuthGuard>
  );
}
