"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, getCountFromServer, orderBy, DocumentData, Query as FirestoreQuery, writeBatch, doc } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Trash2, Search } from 'lucide-react';
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
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';

const PAGE_SIZE = 20;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [displayedStudents, setDisplayedStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const studentsCollectionRef = useMemo(() => firestore ? collection(firestore, 'alunos') : null, [firestore]);

  const fetchInitialStudents = useCallback(async () => {
    if (!studentsCollectionRef) return;
    setIsLoading(true);

    try {
      // Get total count
      const countQuery = query(studentsCollectionRef);
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalCount(countSnapshot.data().count);
      
      // Get all students for local filtering
      const allStudentsQuery = query(studentsCollectionRef, orderBy("nome"));
      const allDocsSnapshot = await getDocs(allStudentsQuery);
      const allStudentData = allDocsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllStudents(allStudentData);

      // Set initial paginated view
      const initialPageData = allStudentData.slice(0, PAGE_SIZE);
      setDisplayedStudents(initialPageData);
      setLastVisible(allDocsSnapshot.docs[PAGE_SIZE -1] || null); // This is not really used anymore but kept for structure
      setCurrentPage(1);

    } catch (error: any) {
      console.error("Erro detalhado ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar alunos",
        description: `Ocorreu um erro ao comunicar com a base de dados. Detalhe: ${error.message}`,
      });
      setDisplayedStudents([]);
      setAllStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentsCollectionRef, toast]);
  
  useEffect(() => {
    fetchInitialStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);


  useEffect(() => {
    if (searchTerm === '') {
      // Reset to paginated view if search is cleared
      const totalPages = Math.ceil(totalCount / PAGE_SIZE);
      const isCurrentPageInvalid = currentPage > totalPages && totalPages > 0;
      const pageToShow = isCurrentPageInvalid ? 1 : currentPage;
      
      const startIndex = (pageToShow - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      setDisplayedStudents(allStudents.slice(startIndex, endIndex));
      if (isCurrentPageInvalid) setCurrentPage(1);

    } else {
      // Filter locally
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      const filtered = allStudents.filter(student => 
        student.nome?.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setDisplayedStudents(filtered);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, allStudents]);


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
        setIsDeleting(false);
        return;
      }
      
      const batchPromises = [];
      // Firestore batch limit is 500 operations
      for (let i = 0; i < allDocsSnapshot.docs.length; i += 500) {
        const batch = writeBatch(firestore);
        const chunk = allDocsSnapshot.docs.slice(i, i + 500);
        chunk.forEach(docSnapshot => {
          batch.delete(doc(firestore, "alunos", docSnapshot.id));
        });
        batchPromises.push(batch.commit());
      }
      
      await Promise.all(batchPromises);

      // Limpar o estado local (cache)
      setDisplayedStudents([]);
      setAllStudents([]);
      setTotalCount(0);
      setLastVisible(null);
      setCurrentPage(1);
      setSearchTerm('');

      toast({
        title: "Sucesso!",
        description: `${totalDocs} registos de alunos foram apagados. A página será recarregada.`,
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
       if (window.location) {
         // Não muda o estado se a página está prestes a ser recarregada
       } else {
          setIsDeleting(false);
       }
    }
  };
  
  const handleNextPage = () => {
    const newPage = currentPage + 1;
    const startIndex = (newPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    setDisplayedStudents(allStudents.slice(startIndex, endIndex));
    setCurrentPage(newPage);
  };
  
  const handlePrevPage = () => {
    const newPage = currentPage - 1;
    const startIndex = (newPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    setDisplayedStudents(allStudents.slice(startIndex, endIndex));
    setCurrentPage(newPage);
  };
  
  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;
  const isSearching = searchTerm.length > 0;

  if (isLoading && allStudents.length === 0) {
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
       <div className="flex flex-col sm:flex-row justify-end sm:items-center gap-4">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
            type="text"
            placeholder="Filtrar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            />
        </div>
      </div>
      <StudentTable
        students={displayedStudents}
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        onRowClick={handleStudentSelect}
        isLoading={isLoading}
        isSearching={isSearching}
      />
      <StudentDetailSheet 
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={handleCloseSheet}
      />
       <div className="flex justify-end pt-6 border-t border-border/10">
            <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="shrink-0">
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
                <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive hover:bg-destructive/90">Sim, apagar tudo</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
    </div>
  );
}
    