
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import SubjectTable from './subject-table';
import SubjectEditDialog from './subject-edit-dialog';

export default function SubjectManager() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [editingSubject, setEditingSubject] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deletingSubject, setDeletingSubject] = useState<any | null>(null);

  const subjectsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'subjects'), orderBy('name'));
  }, [firestore]);

  const { data: subjects, isLoading: isSubjectsLoading } = useCollection(subjectsQuery);

  const handleEditSubject = (subject: any) => {
    setEditingSubject(subject);
    setIsNew(false);
  };

  const handleNewSubject = () => {
    setEditingSubject({});
    setIsNew(true);
  };

  const handleDeleteRequest = (subject: any) => {
    setDeletingSubject(subject);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingSubject) return;
    try {
        await deleteDoc(doc(firestore, 'subjects', deletingSubject.id));
        toast({
            title: "Disciplina Eliminada",
            description: `A disciplina "${deletingSubject.name}" foi eliminada com sucesso.`
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Eliminar',
            description: 'Não foi possível eliminar a disciplina. Tente novamente.'
        });
    } finally {
        setDeletingSubject(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingSubject(null);
    setIsNew(false);
  };

  const handleSaveChanges = (updatedData: any, subjectId?: string) => {
    if (!firestore) return;

    const id = subjectId || doc(collection(firestore, 'subjects')).id;
    const docRef = doc(firestore, 'subjects', id);
    
    setDocumentNonBlocking(docRef, { id, ...updatedData }, { merge: true });

    toast({
      title: isNew ? "Disciplina Criada" : "Disciplina Atualizada",
      description: `A disciplina "${updatedData.name}" foi salva com sucesso.`,
    });
    
    handleCloseDialog();
  };

  return (
    <>
       <div className="flex min-h-screen flex-col">
         <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                      <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Disciplinas</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <Button onClick={handleNewSubject}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Disciplina
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
            {isSubjectsLoading ? (
                 <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ): (
                <SubjectTable 
                  subjects={subjects || []} 
                  onEdit={handleEditSubject} 
                  onDelete={handleDeleteRequest}
                />
            )}
          </div>
        </main>
        <AppFooter />
      </div>

      {editingSubject && (
        <SubjectEditDialog
          isOpen={!!editingSubject}
          onClose={handleCloseDialog}
          subject={isNew ? null : editingSubject}
          onSave={handleSaveChanges}
        />
      )}

      {deletingSubject && (
        <AlertDialog open={!!deletingSubject} onOpenChange={() => setDeletingSubject(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isto irá eliminar permanentemente a disciplina
                        <strong className="text-foreground"> {deletingSubject.name}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
