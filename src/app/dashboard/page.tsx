
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, doc, getDocs, limit, orderBy } from 'firebase/firestore';
import { Loader2, Users, UserCog, Megaphone, CalendarCheck, NotebookText, Gamepad2, History, ShieldAlert, Briefcase, LayoutGrid, FileText, GitBranch, Database } from 'lucide-react';
import StatCard from '@/components/stat-card';
import { UserNav } from '@/components/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import AuthGuard from '@/components/auth-guard';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from '@/components/notification-center';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentCount, setStudentCount] = useState<number | React.ReactNode>(<Loader2 className="h-5 w-5 animate-spin" />);

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
    // Bypass total por e-mail direto (Chave Mestra)
    const adminEmails = ['mestrejpfg@gmail.com', 'fortalezaem@gmail.com'];
    if (user?.email && adminEmails.includes(user.email.toLowerCase())) return true;

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
  
  const canViewStudents = useMemo(() => hasPermission('view:students'), [userProfile, profileDetails, user]);
  const canManageOccurrences = useMemo(() => hasPermission('manage:occurrences'), [userProfile, profileDetails, user]);
  const canManageServidores = useMemo(() => hasPermission('manage:cadastros'), [userProfile, profileDetails, user]);
  const canManageGrades = useMemo(() => hasPermission('manage:grades'), [userProfile, profileDetails, user]);
  const canManageAttendance = useMemo(() => hasPermission('manage:attendance'), [userProfile, profileDetails, user]);
  const canManageClasses = useMemo(() => hasPermission('manage:students'), [userProfile, profileDetails, user]);
  const canManageTranscript = useMemo(() => hasPermission('manage:transcript'), [userProfile, profileDetails, user]);
  const canManageMigration = useMemo(() => hasPermission('manage:migration'), [userProfile, profileDetails, user]);
  const canManageDatabase = useMemo(() => hasPermission('manage:database'), [userProfile, profileDetails, user]);

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
        try {
            if (canViewStudents) {
                const snapshot = await getDocs(collection(firestore, 'alunos'));
                setStudentCount(snapshot.size);
            } else {
                 setStudentCount(0);
            }
        } catch (e) {
            console.error("Error fetching students:", e);
            setStudentCount('N/A');
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
                  <p className="text-muted-foreground">Aceda a todas as ferramentas de gestão escolar.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {canViewStudents && (
                    <StatCard
                        title="Alunos Ativos"
                        value={studentCount}
                        icon={Users}
                        description="Gestão de fichas e documentos"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/students')}>Gerir</Button>}
                    />
                  )}
                  
                  {canManageServidores && (
                    <StatCard
                        title="Servidores"
                        value="RH"
                        icon={Briefcase}
                        description="Cadastro de funcionários"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/servidores')}>Aceder</Button>}
                    />
                  )}

                  {canManageAttendance && (
                    <StatCard
                        title="Frequência"
                        value="Chamada"
                        icon={CalendarCheck}
                        description="Registo e relatórios"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/attendance')}>Registar</Button>}
                    />
                  )}

                  {canManageGrades && (
                    <StatCard
                        title="Avaliações"
                        value="Notas"
                        icon={NotebookText}
                        description="Boletins e desempenho"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/grades')}>Lançar</Button>}
                    />
                  )}

                  {canManageOccurrences && (
                    <StatCard
                        title="Ocorrências"
                        value={allEventsFlattenedCount(recentRecords)}
                        icon={ShieldAlert}
                        description="Registros disciplinares"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/occurrences')}>Histórico</Button>}
                    />
                  )}

                  {canManageClasses && (
                    <StatCard
                        title="Turmas"
                        value="Classes"
                        icon={LayoutGrid}
                        description="Listas e remanejamento"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/classes')}>Gerir</Button>}
                    />
                  )}

                  {canManageTranscript && (
                    <StatCard
                        title="Históricos"
                        value="PDF"
                        icon={FileText}
                        description="Gerador de histórico escolar"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/transcript')}>Gerar</Button>}
                    />
                  )}

                  {canManageMigration && (
                    <StatCard
                        title="Anos Letivos"
                        value="Migração"
                        icon={GitBranch}
                        description="Transição de ano e formatura"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/migration')}>Configurar</Button>}
                    />
                  )}
                  
                  {canManageDatabase && (
                    <StatCard
                        title="Sistema"
                        value="Base Dados"
                        icon={Database}
                        description="Importação e manutenção"
                        action={<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/database')}>Administrar</Button>}
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

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                    {/* Últimas Ocorrências */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <History className="h-5 w-5 text-primary" />
                                <CardTitle>Ocorrências Recentes</CardTitle>
                            </div>
                            <CardDescription>Últimos registros disciplinares no sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingRecentOccurrences ? (
                                <div className="flex py-10 justify-center"><Loader2 className="animate-spin text-primary"/></div>
                            ) : latestEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {latestEvents.map((ev, i) => (
                                        <div key={i} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold truncate max-w-[200px]">{ev.studentName}</span>
                                                <Badge variant="outline" className="text-[10px] h-5">{ev.type}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{ev.description}</p>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span>{ev.studentClass}</span>
                                                <span>{format(new Date(ev.date), 'dd/MM HH:mm')}</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Button variant="ghost" className="w-full text-xs" onClick={() => router.push('/dashboard/occurrences')}>Ver todas as ocorrências</Button>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <ShieldAlert className="mx-auto h-8 w-8 mb-2 opacity-20"/>
                                    <p className="text-xs">Nenhum registro recente encontrado.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Atalhos Rápidos para Admin */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <UserCog className="h-5 w-5 text-primary" />
                                <CardTitle>Atalhos Administrativos</CardTitle>
                            </div>
                            <CardDescription>Acesso rápido ao perfil e segurança.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex flex-col gap-2">
                                <Button variant="secondary" className="justify-start" onClick={() => router.push('/profile')}>
                                    <UserCog className="mr-2 h-4 w-4" /> Editar Meu Perfil
                                </Button>
                                <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/announcements')}>
                                    <Megaphone className="mr-2 h-4 w-4" /> Gerir Comunicados
                                </Button>
                                <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/database')}>
                                    <UserCog className="mr-2 h-4 w-4" /> Gestão de Utilizadores
                                </Button>
                             </div>
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
