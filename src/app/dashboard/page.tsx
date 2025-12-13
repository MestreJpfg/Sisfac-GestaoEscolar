
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, doc, getCountFromServer, getDocs } from 'firebase/firestore';
import { Loader2, Users, UserCog, Shield, Database, ClipboardList, Megaphone, CalendarCheck, ArrowLeft, NotebookText, Gamepad2, Award, FileText } from 'lucide-react';
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
  const [chartDrilldown, setChartDrilldown] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isLoadingAllStudents, setIsLoadingAllStudents] = useState(true);

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
  const canViewAnnouncements = useMemo(() => hasPermission('view:announcements'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageAnnouncements = useMemo(() => hasPermission('manage:announcements'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewAttendance = useMemo(() => hasPermission('view:attendance'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageAttendance = useMemo(() => hasPermission('manage:attendance'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewDatabase = useMemo(() => hasPermission('view:database'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageDatabase = useMemo(() => hasPermission('manage:database'), [userProfile, profileDetails, isPermissionsLoading]);
  const canViewGrades = useMemo(() => hasPermission('view:grades'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageGrades = useMemo(() => hasPermission('manage:grades'), [userProfile, profileDetails, isPermissionsLoading]);
  const canManageTranscripts = useMemo(() => hasPermission('manage:transcript'), [userProfile, profileDetails, isPermissionsLoading]);

  useEffect(() => {
    const fetchCountsAndStudents = async () => {
        if (!firestore) return;

        setIsLoadingAllStudents(true);
        try {
            if (canViewStudents) {
                const studentsColl = collection(firestore, 'alunos');
                const studentsSnapshot = await getDocs(query(studentsColl));
                const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                setStudentCount(studentsData.length);
                setAllStudents(studentsData);
            } else {
                 setStudentCount(0);
                 setAllStudents([]);
            }
        } catch (e) {
            console.error("Error fetching students data: ", e);
            setStudentCount('N/A');
            setAllStudents([]);
        } finally {
            setIsLoadingAllStudents(false);
        }
    };

    if (!isPermissionsLoading) {
      fetchCountsAndStudents();
    }
  }, [firestore, isPermissionsLoading, canViewStudents]);


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
                           {canViewGrades && (
                             <StatCard
                                title="Ranking de Alunos"
                                value={"Desempenho"}
                                icon={Award}
                                description="Classificar alunos por média"
                                action={<Button onClick={() => router.push('/dashboard/ranking')}>Aceder</Button>}
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
                          {canManageTranscripts && (
                            <StatCard
                                title="Histórico Escolar"
                                value={"Gerador"}
                                icon={FileText}
                                description="Gerar históricos escolares completos"
                                action={<Button onClick={() => router.push('/dashboard/transcript')}>Aceder</Button>}
                            />
                          )}
                          {(canViewDatabase || canManageDatabase) && (
                            <StatCard
                              title="Base de Dados"
                              value={"Ferramentas"}
                              icon={Database}
                              description="Importar, exportar e gerir dados"
                              action={canManageDatabase ? <Button onClick={() => router.push('/dashboard/database')}>Aceder</Button> : undefined}
                            />
                          )}
                          <StatCard
                            title="Entretenimento"
                            value={"Jogos"}
                            icon={Gamepad2}
                            description="Pequenos jogos para passar o tempo"
                            action={<Button onClick={() => router.push('/dashboard/games')}>Jogar</Button>}
                           />
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
                                    {chartDrilldown ? `Total de alunos por turma e turno (${allStudents.filter(s => s.serie === chartDrilldown).length || 0} alunos).` : 'Clique duplo numa barra para ver os detalhes da série.'}
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
                            <StudentDistributionChart 
                                students={allStudents}
                                isLoading={isLoadingAllStudents}
                                onDrilldown={setChartDrilldown}
                                drilledSerie={chartDrilldown}
                            />
                        </CardContent>
                    </Card>
                    <NeeDistributionChart students={allStudents} isLoading={isLoadingAllStudents} />
                  </div>
                )}
            </div>
            </main>
            <AppFooter />
        </div>
    </AuthGuard>
  );
}
