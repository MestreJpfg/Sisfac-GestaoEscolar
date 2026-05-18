
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, doc, getDocs, limit, orderBy } from 'firebase/firestore';
import { 
  Loader2, Users, UserCog, Megaphone, CalendarCheck, 
  NotebookText, Gamepad2, History, ShieldAlert, 
  Briefcase, LayoutGrid, FileText, GitBranch, Database, GripVertical,
  Award, ScrollText
} from 'lucide-react';
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
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

// DND Kit Imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableStatCard } from '@/components/sortable-stat-card';

type CardId = 'students' | 'servidores' | 'attendance' | 'grades' | 'occurrences' | 'classes' | 'transcript' | 'migration' | 'database' | 'games';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [studentCount, setStudentCount] = useState<number | string | React.ReactNode>(<Loader2 className="h-4 w-4 animate-spin" />);
  const [occurrenceCount, setOccurrenceCount] = useState<number | string | React.ReactNode>(<Loader2 className="h-4 w-4 animate-spin" />);
  
  // Dashboard Order State
  const [cardOrder, setCardOrder] = useState<CardId[]>([]);

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
  
  const permissions = useMemo(() => ({
    students: hasPermission('view:students'),
    servidores: hasPermission('manage:cadastros'),
    attendance: hasPermission('manage:attendance'),
    grades: hasPermission('manage:grades'),
    occurrences: hasPermission('manage:occurrences'),
    classes: hasPermission('manage:students'),
    transcript: hasPermission('manage:transcript'),
    migration: hasPermission('manage:migration'),
    database: hasPermission('manage:database'),
    games: true // Todos têm acesso a jogos
  }), [userProfile, profileDetails, user]);

  // Inicializar e Sincronizar Ordem
  useEffect(() => {
    if (!isPermissionsLoading && userProfile) {
        const defaultOrder: CardId[] = ['students', 'servidores', 'attendance', 'grades', 'occurrences', 'classes', 'transcript', 'migration', 'database', 'games'];
        const savedOrder = userProfile.dashboardOrder as CardId[];
        
        if (savedOrder && Array.isArray(savedOrder)) {
            // Garantir que novos cartões adicionados ao sistema apareçam mesmo se não estiverem no savedOrder
            const combinedOrder = [...savedOrder];
            defaultOrder.forEach(id => {
                if (!combinedOrder.includes(id)) combinedOrder.push(id);
            });
            setCardOrder(combinedOrder);
        } else {
            setCardOrder(defaultOrder);
        }
    }
  }, [isPermissionsLoading, userProfile]);

  // 2. Buscar Ocorrências Recentes
  const occurrencesQuery = useMemo(() => {
    if (!firestore || !permissions.occurrences) return null;
    return query(collection(firestore, 'ocorrencias'), orderBy('lastUpdated', 'desc'), limit(10));
  }, [firestore, permissions.occurrences]);
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

  // 3. Estatísticas
  useEffect(() => {
    if (isPermissionsLoading || !firestore) return;
    
    const fetchData = async () => {
        try {
            if (permissions.students) {
                const snapshot = await getDocs(collection(firestore, 'alunos'));
                setStudentCount(snapshot.size);
            } else {
                 setStudentCount(0);
            }

            if (permissions.occurrences) {
                const occSnapshot = await getDocs(collection(firestore, 'ocorrencias'));
                let total = 0;
                occSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.eventos && Array.isArray(data.eventos)) {
                        total += data.eventos.length;
                    }
                });
                setOccurrenceCount(total);
            } else {
                setOccurrenceCount(0);
            }
        } catch (e) {
            console.error("Error fetching stats:", e);
            setStudentCount('N/A');
            setOccurrenceCount('N/A');
        }
    };
    fetchData();
  }, [firestore, isPermissionsLoading, permissions]);

  const safeFormatDate = (dateStr: string) => {
      try {
          if (!dateStr) return '--/--';
          return format(new Date(dateStr), 'dd/MM HH:mm', { locale: ptBR });
      } catch {
          return '--/--';
      }
  };

  // DND Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCardOrder((items) => {
        const oldIndex = items.indexOf(active.id as CardId);
        const newIndex = items.indexOf(over.id as CardId);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Salvar ordem no Firestore
        if (firestore && user) {
            const userRef = doc(firestore, 'users', user.uid);
            setDocumentNonBlocking(userRef, { dashboardOrder: newOrder }, { merge: true });
        }
        
        return newOrder;
      });
    }
  };

  // Map of Card definitions
  const allCards: Record<CardId, { id: CardId, title: string, value: any, icon: any, description: string, href: string, actionLabel: string, show: boolean }> = {
    students: {
        id: 'students',
        title: "Alunos Ativos",
        value: studentCount,
        icon: Users,
        description: "Gestão de fichas e documentos",
        href: '/dashboard/students',
        actionLabel: 'Gerir',
        show: permissions.students
    },
    servidores: {
        id: 'servidores',
        title: "Servidores",
        value: "RH",
        icon: Briefcase,
        description: "Cadastro de funcionários",
        href: '/dashboard/servidores',
        actionLabel: 'Aceder',
        show: permissions.servidores
    },
    attendance: {
        id: 'attendance',
        title: "Frequência",
        value: "Chamada",
        icon: CalendarCheck,
        description: "Registo e relatórios",
        href: '/dashboard/attendance',
        actionLabel: 'Registar',
        show: permissions.attendance
    },
    grades: {
        id: 'grades',
        title: "Avaliações",
        value: "Notas",
        icon: NotebookText,
        description: "Boletins e desempenho",
        href: '/dashboard/grades',
        actionLabel: 'Lançar',
        show: permissions.grades
    },
    occurrences: {
        id: 'occurrences',
        title: "Ocorrências",
        value: occurrenceCount,
        icon: ShieldAlert,
        description: "Registros disciplinares",
        href: '/dashboard/occurrences',
        actionLabel: 'Histórico',
        show: permissions.occurrences
    },
    classes: {
        id: 'classes',
        title: "Turmas",
        value: "Classes",
        icon: LayoutGrid,
        description: "Listas e remanejamento",
        href: '/dashboard/classes',
        actionLabel: 'Gerir',
        show: permissions.classes
    },
    transcript: {
        id: 'transcript',
        title: "Históricos",
        value: "PDF",
        icon: FileText,
        description: "Gerador de histórico escolar",
        href: '/dashboard/transcript',
        actionLabel: 'Gerar',
        show: permissions.transcript
    },
    migration: {
        id: 'migration',
        title: "Anos Letivos",
        value: "Migração",
        icon: GitBranch,
        description: "Transição de ano e formatura",
        href: '/dashboard/migration',
        actionLabel: 'Configurar',
        show: permissions.migration
    },
    database: {
        id: 'database',
        title: "Sistema",
        value: "Base Dados",
        icon: Database,
        description: "Importação e manutenção",
        href: '/dashboard/database',
        actionLabel: 'Administrar',
        show: permissions.database
    },
    games: {
        id: 'games',
        title: "Entretenimento",
        value: "Jogos",
        icon: Gamepad2,
        description: "Pausa para descanso",
        href: '/dashboard/games',
        actionLabel: 'Jogar',
        show: true
    }
  };

  const visibleCardIds = useMemo(() => {
    return cardOrder.filter(id => allCards[id]?.show);
  }, [cardOrder, permissions]);

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
                            <NotificationCenter />
                            <ThemeToggle />
                            <UserNav />
                        </nav>
                    </div>
                </div>
            </header>

            <main className="flex-1">
              <div className="container py-8">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Bem-vindo(a), {welcomeName}!</h2>
                    <p className="text-muted-foreground">Personalize a sua dashboard arrastando os cartões.</p>
                  </div>
                  <Badge variant="outline" className="hidden md:flex gap-1 text-[10px] items-center text-muted-foreground">
                    <GripVertical className="h-3 w-3" /> Arraste para organizar
                  </Badge>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={visibleCardIds}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {visibleCardIds.map((id) => {
                        const card = allCards[id];
                        return (
                          <SortableStatCard
                            key={id}
                            id={id}
                            title={card.title}
                            value={card.value}
                            icon={card.icon}
                            description={card.description}
                            action={
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => router.push(card.href)}
                                    className="w-full mt-2"
                                >
                                    {card.actionLabel}
                                </Button>
                            }
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>

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
                                <div className="flex py-10 justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary"/>
                                </div>
                            ) : latestEvents.length > 0 ? (
                                <div className="space-y-4">
                                    {latestEvents.map((ev, i) => (
                                        <div key={i} className="flex flex-col gap-1 pb-3 border-b last:border-0">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-bold truncate max-w-[200px]">{ev.studentName}</span>
                                                <Badge variant="outline" className="text-[10px] h-5">{ev.type}</Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1 italic">"{ev.description}"</p>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span className="font-semibold">{ev.studentClass}</span>
                                                <span>{safeFormatDate(ev.date)}</span>
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

                    {/* Atalhos Rápidos com Permissões */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <UserCog className="h-5 w-5 text-primary" />
                                <CardTitle>Atalhos Rápidos</CardTitle>
                            </div>
                            <CardDescription>Acesso imediato às suas ferramentas e configurações.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <Button variant="secondary" className="justify-start" onClick={() => router.push('/profile')}>
                                    <UserCog className="mr-2 h-4 w-4" /> Meu Perfil
                                </Button>
                                
                                <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/ranking')}>
                                    <Award className="mr-2 h-4 w-4" /> Ranking Escolar
                                </Button>

                                {hasPermission('manage:announcements') && (
                                    <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/announcements')}>
                                        <Megaphone className="mr-2 h-4 w-4" /> Comunicados
                                    </Button>
                                )}

                                {hasPermission('manage:transcript') && (
                                    <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/transcript')}>
                                        <ScrollText className="mr-2 h-4 w-4" /> Históricos
                                    </Button>
                                )}

                                {hasPermission('manage:users') && (
                                    <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/database')}>
                                        <Users className="mr-2 h-4 w-4" /> Utilizadores
                                    </Button>
                                )}

                                {hasPermission('manage:database') && (
                                    <Button variant="secondary" className="justify-start" onClick={() => router.push('/dashboard/database')}>
                                        <Database className="mr-2 h-4 w-4" /> Manutenção
                                    </Button>
                                )}
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
