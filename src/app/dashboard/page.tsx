
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, doc, getDocs, limit, orderBy } from 'firebase/firestore';
import { Loader2, Users, UserCog, Database, ClipboardList, Megaphone, CalendarCheck, ArrowLeft, NotebookText, Gamepad2, Award, FileText, GitBranch, Briefcase, ShieldAlert, History } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/auth-guard';
import AppFooter from '@/components/app-footer';
import StudentDistributionChart from '@/components/student-distribution-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NeeDistributionChart from '@/components/nee-distribution-chart';
import { NotificationCenter } from '@/components/notification-center';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentCount, setStudentCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);
  const [chartDrilldown, setChartDrilldown] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isLoadingAllStudents, setIsLoadingAllStudents] = useState(true);

  // 1. Permissões e Perfil
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
    if (!userProfile) return false;
    if (userProfile.profileId === 'Administrador' || userProfile.profileId === 'Administrador(a)') return true;
    if (userProfile.customPermissions?.includes(permission)) return true;
    if (profileDetails?.permissions?.[permission] === true) return true;
    
    if (permission.startsWith('view:')) {
        const managePermission = permission.replace('view:', 'manage:');
        if (profileDetails?.permissions?.[managePermission] === true || userProfile.customPermissions?.includes(managePermission)) return true;
    }
    return false;
  };
  
  const canViewStudents = useMemo(() => hasPermission('view:students'), [userProfile, profileDetails]);
  const canManageOccurrences = useMemo(() => hasPermission('manage:occurrences'), [userProfile, profileDetails]);

  // 2. Buscar Ocorrências Recentes
  const occurrencesQuery = useMemo(() => {
    if (!firestore || !canManageOccurrences) return null;
    return query(collection(firestore, 'ocorrencias'), orderBy('lastUpdated', 'desc'), limit(10));
  }, [firestore, canManageOccurrences]);
  const { data: recentRecords, isLoading: isLoadingRecentOccurrences } = useCollection(occurrencesQuery);

  const latestEvents = useMemo(() => {
    if (!recentRecords) return [];
    const events: any[] = [];
    recentRecords.forEach(record => {
        if (record.eventos && Array.isArray(record.eventos)) {
            record.eventos.forEach((ev: any) => {
                events.push({
                    ...ev,
                    studentName: record.studentName,
                    studentClass: record.studentClass
                });
            });
        }
    });
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [recentRecords]);

  // 3. Efeito para carregar estatísticas
  useEffect(() => {
    if (isPermissionsLoading || !firestore) return;
    
    const fetchData = async () => {
        setIsLoadingAllStudents(true);
        try {
            if (canViewStudents) {
                const snapshot = await getDocs(collection(firestore, 'alunos'));
                const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStudentCount(studentsData.length);
                setAllStudents(studentsData);
            } else {
                 setStudentCount(0);
                 setAllStudents([]);
            }
        } catch (e) {
            console.error("Error fetching students:", e);
            setStudentCount('N/A');
        } finally {
            setIsLoadingAllStudents(false);
        }
    };
    fetchData();
  }, [firestore, isPermissionsLoading, canViewStudents]);

  const welcomeName = user?.displayName?.split(' ')[0] || 'Utilizador';

  if (isUserLoading) {
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
                            <NotificationCenter />
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
                  <p className="text-muted-foreground">Visão geral do sistema e registros recentes.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {canViewStudents && (
                    <StatCard
                        title="Alunos Ativos"
                        value={studentCount}
                        icon={Users}
                        description="Total de alunos na base"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/students')}>Gerir</Button>}
                    />
                  )}
                  
                  <StatCard
                      title="Meu Perfil"
                      value={user?.displayName ?? ''}
                      icon={UserCog}
                      description={user?.email || ''}
                      action={<Button variant="outline" size="sm" onClick={() => router.push('/profile')}>Aceder</Button>}
                  />

                  {canManageOccurrences && (
                    <StatCard
                        title="Ocorrências"
                        value={allEventsFlattenedCount(recentRecords)}
                        icon={ShieldAlert}
                        description="Registros disciplinares"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/occurrences')}>Histórico</Button>}
                    />
                  )}

                  <StatCard
                    title="Entretenimento"
                    value="Jogos"
                    icon={Gamepad2}
                    description="Pausa para descanso"
                    action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/games')}>Jogar</Button>}
                   />
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-3">
                    {/* Gráfico de Distribuição */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>{chartDrilldown ? `Turmas: ${chartDrilldown}` : 'Distribuição por Série'}</CardTitle>
                                <CardDescription>Capacidade vs Matriculados</CardDescription>
                            </div>
                            {chartDrilldown && <Button variant="ghost" size="sm" onClick={() => setChartDrilldown(null)}><ArrowLeft className="h-4 w-4 mr-1"/> Voltar</Button>}
                        </CardHeader>
                        <CardContent>
                            <StudentDistributionChart 
                                students={allStudents}
                                isLoading={isLoadingAllStudents}
                                onDrilldown={setChartDrilldown}
                                drilledSerie={chartDrilldown}
                            />
                        </CardContent>
                    </Card>

                    {/* Últimas Ocorrências */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                <CardTitle>Últimas Ocorrências</CardTitle>
                            </div>
                            <CardDescription>Resumo dos registros mais recentes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingRecentOccurrences ? (
                                <div className="flex py-10 justify-center"><Loader2 className="animate-spin text-primary"/></div>
                            ) : latestEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {latestEvents.map((ev, i) => (
                                        <div key={i} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold truncate max-w-[150px]">{ev.studentName}</span>
                                                <Badge variant="outline" className="text-[10px] h-5">{ev.type}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{ev.description}</p>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span>{ev.studentClass}</span>
                                                <span>{format(new Date(ev.date), 'dd/MM HH:mm')}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" className="w-full text-xs" onClick={() => router.push('/dashboard/occurrences')}>Ver todas</Button>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <ShieldAlert className="mx-auto h-8 w-8 mb-2 opacity-20"/>
                                    <p className="text-xs">Nenhum registro recente.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            </main>
            <AppFooter />
        </div>
    </AuthGuard>
  );
}

function allEventsFlattenedCount(records: any[] | null) {
    if (!records) return 0;
    return records.reduce((acc, r) => acc + (r.eventos?.length || 0), 0);
}
