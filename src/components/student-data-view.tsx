"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, getCountFromServer, orderBy, DocumentData, Query as FirestoreQuery, writeBatch, doc } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const PAGE_SIZE = 50;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const studentsCollectionRef = useMemo(() => firestore ? collection(firestore, 'alunos') : null, [firestore]);

  const fetchStudents = useCallback(async (direction: 'next' | 'first' = 'first') => {
    if (!studentsCollectionRef) return;
    setIsLoading(true);

    try {
      if (totalCount === 0) {
        const countSnapshot = await getCountFromServer(studentsCollectionRef);
        setTotalCount(countSnapshot.data().count);
      }
      
      let dataQuery: FirestoreQuery;

      if (direction === 'next' && lastVisible) {
        dataQuery = query(studentsCollectionRef, orderBy("nome"), startAfter(lastVisible), limit(PAGE_SIZE));
        setCurrentPage(prev => prev + 1);
      } else {
        dataQuery = query(studentsCollectionRef, orderBy("nome"), limit(PAGE_SIZE));
        setCurrentPage(1);
      }
      
      const snapshot = await getDocs(dataQuery);
      
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStudents(studentData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);

    } catch (error: any) {
      console.error("Erro detalhado ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar alunos",
        description: `Ocorreu um erro ao comunicar com a base de dados. Detalhe: ${error.message}`,
      });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentsCollectionRef, lastVisible, totalCount, toast]);

  const handleDeleteAll = async () => {
    if (!firestore || !studentsCollectionRef) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "Não foi possível conectar à base de dados."
      });
      return;
    }
    setIsDeleting(true);
    try {
      const allDocsSnapshot = await getDocs(query(studentsCollectionRef));
      const totalDocs = allDocsSnapshot.size;
      if (totalDocs === 0) {
        toast({ title: "Base de dados já está vazia." });
        return;
      }
      
      let deletedCount = 0;
      const batchPromises = [];
      // Firestore batch limit is 500 operations
      for (let i = 0; i < allDocsSnapshot.docs.length; i += 500) {
        const batch = writeBatch(firestore);
        const chunk = allDocsSnapshot.docs.slice(i, i + 500);
        chunk.forEach(docSnapshot => {
          batch.delete(doc(firestore, "alunos", docSnapshot.id));
        });
        batchPromises.push(batch.commit());
        deletedCount += chunk.length;
      }
      
      await Promise.all(batchPromises);

      toast({
        title: "Sucesso!",
        description: `${deletedCount} registos de alunos foram apagados. A página será recarregada.`,
      });

      // Reload the page to go back to the uploader
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      console.error("Erro ao apagar todos os documentos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Apagar",
        description: `Ocorreu um erro: ${error.message}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (firestore) {
      fetchStudents('first');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);

  const handleNextPage = () => {
    fetchStudents('next');
  };
  
  const handlePrevPage = () => {
    fetchStudents('first');
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  if (isLoading && students.length === 0) {
     return (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )
  }
  
  if (isDeleting) {
    return (
      <div className="flex flex-col items-center justify-center h-96 rounded-lg border-2 border-dashed border-destructive/50 bg-card/50">
        <Loader2 className="h-12 w-12 animate-spin text-destructive" />
        <p className="mt-4 text-destructive-foreground">A apagar todos os registos... Isso pode demorar um pouco.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">Painel de Alunos</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Apagar Base de Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isto irá apagar permanentemente todos os 
                <span className="font-bold text-destructive-foreground"> {totalCount}</span> registos de alunos da base de dados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAll}>Sim, apagar tudo</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <StudentTable
        students={students}
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        isLoading={isLoading}
      />
    </div>
  );
}
