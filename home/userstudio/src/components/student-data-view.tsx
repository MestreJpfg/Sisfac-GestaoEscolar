"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, getCountFromServer, orderBy, writeBatch, doc } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Trash2, Search, Users, X } from 'lucide-react';
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
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

const PAGE_SIZE = 20;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [displayedStudents, setDisplayedStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterNee, setFilterNee] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);


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
    // Start with all students
    let filteredStudents = allStudents;

    // Apply NEE filter first
    if (filterNee) {
      filteredStudents = filteredStudents.filter(student => student.nee);
    }
    
    // Then apply search term filter
    if (searchTerm !== '') {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      filteredStudents = filteredStudents.filter(student => 
        student.nome?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
    
    // If no filters are active, apply pagination
    if (searchTerm === '' && !filterNee) {
      const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
      const isCurrentPageInvalid = currentPage > totalPages && totalPages > 0;
      const pageToShow = isCurrentPageInvalid ? 1 : currentPage;
      
      const startIndex = (pageToShow - 1) * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      setDisplayedStudents(filteredStudents.slice(startIndex, endIndex));
      if (isCurrentPageInvalid) setCurrentPage(1);
    } else {
      // If any filter is active, show all results without pagination
      setDisplayedStudents(filteredStudents);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, allStudents, filterNee, currentPage]);

   useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchVisible]);


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
      setCurrentPage(1);
      setSearchTerm('');
      setFilterNee(false);

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
  
  const handleSearchBlur = () => {
    if (searchTerm === '') {
      setIsSearchVisible(false);
    }
  }

  const totalPages = Math.ceil(allStudents.length / PAGE_SIZE);
  const isSearching = searchTerm.length > 0 || filterNee;

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
       <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3 text-foreground">
            <Users className="w-5 h-5 text-primary"/>
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold tracking-tight">{totalCount}</span>
                <span className="text-sm font-medium text-muted-foreground">Alunos</span>
            </div>
            </div>
            <div className="relative w-full sm:w-auto flex justify-end">
              {isSearchVisible ? (
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={handleSearchBlur}
                    className="pl-9 pr-9"
                  />
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => { setSearchTerm(''); setIsSearchVisible(false); }}>
                    <X className="h-4 w-4"/>
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsSearchVisible(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              )}
            </div>
        </div>
        <div className="flex items-center justify-end space-x-2">
            <Checkbox id="nee-filter" checked={filterNee} onCheckedChange={(checked) => setFilterNee(checked as boolean)} />
            <Label htmlFor="nee-filter" className="text-sm font-normal text-muted-foreground">
                Apenas alunos com NEE
            </Label>
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
    