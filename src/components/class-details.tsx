'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft, Users, UserPlus, UserMinus, Search, Save } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { ScrollArea } from './ui/scroll-area';

const StudentListItem = ({ student, onAction, icon: Icon, actionLabel }: { student: any, onAction: (student: any) => void, icon: React.ElementType, actionLabel: string }) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
        <span className="text-sm font-medium truncate">{student.nome}</span>
        <Button variant="ghost" size="icon" onClick={() => onAction(student)} aria-label={actionLabel}>
            <Icon className="h-4 w-4" />
        </Button>
    </div>
);


export default function ClassDetails({ classId }: { classId: string }) {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [inClassStudentIds, setInClassStudentIds] = useState<Set<string>>(new Set());
  const [availableSearch, setAvailableSearch] = useState('');
  const [inClassSearch, setInClassSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const debouncedAvailableSearch = useDebounce(availableSearch, 300);
  const debouncedInClassSearch = useDebounce(inClassSearch, 300);

  // Fetch class data
  const classDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'classes', classId) : null, [firestore, classId]);
  const { data: classData, isLoading: isClassLoading } = useDoc(classDocRef);

  // Fetch all students
  const studentsQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'alunos'), orderBy('nome')) : null, [firestore]);
  const { data: allStudents, isLoading: areStudentsLoading } = useCollection(studentsQuery);

  useEffect(() => {
    if (classData?.studentIds) {
      setInClassStudentIds(new Set(classData.studentIds));
    }
  }, [classData]);

  const { availableStudents, inClassStudents } = useMemo(() => {
    if (!allStudents) return { availableStudents: [], inClassStudents: [] };

    const inClass = allStudents.filter(s => inClassStudentIds.has(s.id));
    const available = allStudents.filter(s => !inClassStudentIds.has(s.id));

    return { availableStudents: available, inClassStudents: inClass };
  }, [allStudents, inClassStudentIds]);

  const filteredAvailableStudents = useMemo(() => {
    if (!debouncedAvailableSearch) return availableStudents;
    return availableStudents.filter(s => s.nome.toLowerCase().includes(debouncedAvailableSearch.toLowerCase()));
  }, [availableStudents, debouncedAvailableSearch]);

  const filteredInClassStudents = useMemo(() => {
    if (!debouncedInClassSearch) return inClassStudents;
    return inClassStudents.filter(s => s.nome.toLowerCase().includes(debouncedInClassSearch.toLowerCase()));
  }, [inClassStudents, debouncedInClassSearch]);

  const addStudentToClass = (student: any) => {
    setInClassStudentIds(prev => new Set(prev).add(student.id));
  };

  const removeStudentFromClass = (student: any) => {
    setInClassStudentIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(student.id);
      return newSet;
    });
  };

  const handleSaveChanges = () => {
    if (!firestore) return;
    setIsSaving(true);
    
    const docRef = doc(firestore, 'classes', classId);
    setDocumentNonBlocking(docRef, { studentIds: Array.from(inClassStudentIds) }, { merge: true });

    setTimeout(() => {
        toast({
          title: "Turma Atualizada",
          description: `A lista de alunos da turma "${classData?.name}" foi salva com sucesso.`,
        });
        setIsSaving(false);
    }, 1000);
  };
  
  const isLoading = isClassLoading || areStudentsLoading;

  return (
    <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/classes')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                    <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                    <h1 className="text-xl font-bold text-primary hidden sm:block">Gerir Alunos da Turma</h1>
                </div>
            </div>
            <div className="flex flex-1 items-center justify-end space-x-4">
                <Button onClick={handleSaveChanges} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Alterações
                </Button>
                <nav className="flex items-center space-x-1">
                    <ThemeToggle />
                    <UserNav />
                </nav>
            </div>
        </div>
        </header>

        <main className="flex-1 py-8">
            <div className="container">
                {isLoading ? (
                    <div className="flex h-64 w-full items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold tracking-tight">{classData?.name}</h2>
                            <p className="text-muted-foreground">Professor(a): {classData?.teacherName || 'Não definido'}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Available Students */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <UserPlus className="h-5 w-5" />
                                        Alunos Disponíveis
                                    </CardTitle>
                                    <div className="relative pt-2">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar aluno..." 
                                            className="pl-8" 
                                            value={availableSearch}
                                            onChange={(e) => setAvailableSearch(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        {filteredAvailableStudents.length > 0 ? (
                                            <div className="space-y-1">
                                                {filteredAvailableStudents.map(student => (
                                                    <StudentListItem key={student.id} student={student} onAction={addStudentToClass} icon={UserPlus} actionLabel="Adicionar à turma" />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-10">Nenhum aluno disponível.</p>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>

                            {/* Students in Class */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Alunos na Turma ({inClassStudents.length})
                                    </CardTitle>
                                    <div className="relative pt-2">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            placeholder="Buscar aluno na turma..." 
                                            className="pl-8"
                                            value={inClassSearch}
                                            onChange={(e) => setInClassSearch(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-96">
                                        {filteredInClassStudents.length > 0 ? (
                                            <div className="space-y-1">
                                                {filteredInClassStudents.map(student => (
                                                    <StudentListItem key={student.id} student={student} onAction={removeStudentFromClass} icon={UserMinus} actionLabel="Remover da turma" />
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-10">Nenhum aluno nesta turma.</p>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </main>
        <AppFooter />
    </div>
  );
}
