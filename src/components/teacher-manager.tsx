
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useFirestore, type UserHookResult } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Input } from './ui/input';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';

const TeacherList = ({ teachers }: { teachers: any[] }) => {
    if (teachers.length === 0) {
        return <p className="text-muted-foreground text-center mt-8">Nenhum professor encontrado.</p>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map(teacher => (
                <Card key={teacher.uid}>
                    <CardHeader>
                        <CardTitle>{teacher.name}</CardTitle>
                        <CardDescription>{teacher.email}</CardDescription>
                    </CardHeader>
                </Card>
            ))}
        </div>
    );
};

const SubjectList = ({ subjects }: { subjects: any[] }) => {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [editingSubject, setEditingSubject] = useState<any>(null);
    const [deletingSubject, setDeletingSubject] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !editingSubject || !editingSubject.name) {
            toast({ variant: 'destructive', title: 'O nome da disciplina é obrigatório.' });
            return;
        }

        setIsSaving(true);
        const isNew = !editingSubject.id;
        const id = isNew ? doc(collection(firestore, 'subjects')).id : editingSubject.id;
        const docRef = doc(firestore, 'subjects', id);
        
        await setDocumentNonBlocking(docRef, { ...editingSubject, id }, { merge: true });

        toast({ title: isNew ? 'Disciplina Criada' : 'Disciplina Atualizada' });
        setEditingSubject(null);
        setIsSaving(false);
    };

    const handleDelete = async () => {
        if (!firestore || !deletingSubject) return;
        await deleteDocumentNonBlocking(doc(firestore, 'subjects', deletingSubject.id));
        toast({ title: 'Disciplina Eliminada' });
        setDeletingSubject(null);
    };
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Disciplinas</CardTitle>
                        <CardDescription>Gerir as disciplinas disponíveis no sistema.</CardDescription>
                    </div>
                    <Button onClick={() => setEditingSubject({ name: '' })}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Disciplina
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                 <div className="space-y-2">
                    {subjects.length > 0 ? subjects.map(subject => (
                        <div key={subject.id} className="flex items-center justify-between p-2 border rounded-md">
                            <span className="font-medium">{subject.name}</span>
                            <div className="space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => setEditingSubject(subject)}>Editar</Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingSubject(subject)}>Eliminar</Button>
                            </div>
                        </div>
                    )) : <p className="text-muted-foreground text-center">Nenhuma disciplina cadastrada.</p>}
                 </div>
            </CardContent>

             {/* Edit/Create Dialog */}
            {editingSubject && (
                 <AlertDialog open={!!editingSubject} onOpenChange={() => setEditingSubject(null)}>
                    <AlertDialogContent>
                        <form onSubmit={handleSave}>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{editingSubject.id ? 'Editar' : 'Criar'} Disciplina</AlertDialogTitle>
                                <div className="pt-4">
                                     <Input 
                                        value={editingSubject.name}
                                        onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                                        placeholder="Nome da Disciplina"
                                        autoFocus
                                    />
                                </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin mr-2"/> : null}
                                    Salvar
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Delete Confirmation */}
            {deletingSubject && (
                <AlertDialog open={!!deletingSubject} onOpenChange={() => setDeletingSubject(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação irá eliminar permanentemente a disciplina "{deletingSubject.name}". Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </Card>
    )
}

export default function TeacherManager({ user }: { user: UserHookResult['user'] }) {
  const firestore = useFirestore();
  const router = useRouter();

  const teachersQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users'), where('profileId', 'in', ['Professor', 'Professor(a)']), orderBy('name'));
  }, [firestore, user]);

  const subjectsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'subjects'), orderBy('name'));
  }, [firestore, user]);

  const { data: teachers, isLoading: isLoadingTeachers } = useCollection(teachersQuery);
  const { data: subjects, isLoading: isLoadingSubjects } = useCollection(subjectsQuery);

  const isLoading = isLoadingTeachers || isLoadingSubjects;

  return (
    <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                      <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Professores e Disciplinas</h1>
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
                {isLoading ? (
                    <div className="flex h-64 w-full items-center justify-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Tabs defaultValue="teachers">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="teachers">Professores ({teachers?.length || 0})</TabsTrigger>
                            <TabsTrigger value="subjects">Disciplinas ({subjects?.length || 0})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="teachers" className="mt-6">
                            <TeacherList teachers={teachers || []} />
                        </TabsContent>
                        <TabsContent value="subjects" className="mt-6">
                           <SubjectList subjects={subjects || []} />
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </main>
        <AppFooter />
    </div>
  );
}
