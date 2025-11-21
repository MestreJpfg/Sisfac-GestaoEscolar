'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import ClassTable from './class-table';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import ClassEditDialog from './class-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export default function ClassManager() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isNew, setIsNew] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [deletingClass, setDeletingClass] = useState<any | null>(null);

  const classesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'classes'), orderBy('name'));
  }, [firestore]);

  const { data: classes, isLoading: isClassesLoading } = useCollection(classesQuery);
  
  // Any authenticated user is authorized to manage classes
  const isAuthorized = true;

  const handleEditClass = (cls: any) => {
    setEditingClass(cls);
    setIsNew(false);
  };

  const handleNewClass = () => {
    setEditingClass({}); 
    setIsNew(true);
  };

  const handleDeleteRequest = (cls: any) => {
    setDeletingClass(cls);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingClass) return;
    try {
        await deleteDoc(doc(firestore, 'classes', deletingClass.id));
        toast({
            title: "Turma Eliminada",
            description: `A turma "${deletingClass.name}" foi eliminada com sucesso.`
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Eliminar',
            description: 'Não foi possível eliminar a turma. Tente novamente.'
        });
    } finally {
        setDeletingClass(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingClass(null);
    setIsNew(false);
  };

  const handleSaveChanges = (updatedData: any, classId?: string) => {
    if (!firestore) return;

    const id = classId || doc(collection(firestore, 'classes')).id;
    const docRef = doc(firestore, 'classes', id);
    
    setDocumentNonBlocking(docRef, { id, ...updatedData }, { merge: true });

    toast({
      title: isNew ? "Turma Criada" : "Turma Atualizada",
      description: `A turma "${updatedData.name}" foi salva com sucesso.`,
    });
    
    handleCloseDialog();
  };

  const isDialogOpen = !!editingClass;
  const dialogClassData = isNew ? null : editingClass;

  return (
    <>
       <div className="flex min-h-screen flex-col">
         <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                      <h1 className="text-lg md:text-xl font-bold text-primary hidden sm:block">Gestão de Turmas</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
                    {isAuthorized && (
                        <Button onClick={handleNewClass}>
                            <Plus className="mr-0 md:mr-2 h-4 w-4" />
                            <span className="hidden md:inline">Nova Turma</span>
                        </Button>
                    )}
                    <nav className="flex items-center space-x-1">
                        <ThemeToggle />
                        <UserNav />
                    </nav>
                </div>
            </div>
        </header>

        <main className="flex-1 py-8">
          <div className="container">
            {isClassesLoading ? (
                 <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ): (
                <ClassTable 
                  classes={classes || []} 
                  onEdit={handleEditClass} 
                  onDelete={handleDeleteRequest}
                  isAuthorized={isAuthorized}
                />
            )}
          </div>
        </main>
        <AppFooter />
      </div>

      {isDialogOpen && (
        <ClassEditDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          classData={dialogClassData}
          onSave={handleSaveChanges}
          isAuthorized={isAuthorized}
        />
      )}

      {deletingClass && (
        <AlertDialog open={!!deletingClass} onOpenChange={() => setDeletingClass(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isto irá eliminar permanentemente a turma
                        <strong className="text-foreground"> {deletingClass.name}</strong>.
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
