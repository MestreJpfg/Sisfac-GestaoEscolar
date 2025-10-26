"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, getCountFromServer, orderBy, writeBatch, doc } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Trash2, Users, Filter, X } from 'lucide-react';
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
import { Card, CardContent } from './ui/card';

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

  const [filters, setFilters] = useState({
    nome: '',
    serie: '',
    classe: '',
    turno: '',
  });

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

    } catch (error: any) {
      console.error("Erro detalhado ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar alunos",
        description: `Ocorreu um erro ao comunicar com a base de dados. Detalhe: ${error.message}`,
      });
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
    let filtered = [...allStudents];
    
    // Apply filters
    (Object.keys(filters) as Array<keyof typeof filters>).forEach(key => {
        const filterValue = filters[key];
        if (filterValue) {
            filtered = filtered.filter(student =>
                student[key]?.toString().toLowerCase().includes(filterValue.toLowerCase())
            );
        }
    });

    // Reset pagination to page 1 whenever filters change
    setCurrentPage(1);
    
    // Apply pagination to the filtered list
    const startIndex = 0; // Start from the first page
    const endIndex = startIndex + PAGE_SIZE;
    setDisplayedStudents(filtered.slice(startIndex, endIndex));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, allStudents]);

  useEffect(() => {
    // This effect handles pagination changes on the already filtered data
    let filtered = [...allStudents];
     (Object.keys(filters) as Array<keyof typeof filters>).forEach(key => {
        const filterValue = filters[key];
        if (filterValue) {
            filtered = filtered.filter(student =>
                student[key]?.toString().toLowerCase().includes(filterValue.toLowerCase())
            );
        }
    });

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    setDisplayedStudents(filtered.slice(startIndex, endIndex));
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, allStudents]);


  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      nome: '',
      serie: '',
      classe: '',
      turno: '',
    });
  }

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
      clearFilters();

      toast({
        title: "Sucesso!",
        description: `${totalDocs} registos de alunos foram apagados. A página será recarregada.`,
      });

      // Reload the page to go back to the uploader
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) => {
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
    setCurrentPage(prev => prev + 1);
  };
  
  const handlePrevPage = () => {
    setCurrentPage(prev => prev - 1);
  };
  
  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const totalFilteredCount = Object.values(filters).some(v => v)
    ? displayedStudents.length 
    : allStudents.length;

  const totalPages = Math.ceil(totalFilteredCount / PAGE_SIZE);
  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');

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
            </div>
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <h3 className="text-sm font-semibold">Filtros da Tabela</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            name="nome"
                            placeholder="Filtrar por nome..."
                            value={filters.nome}
                            onChange={handleFilterChange}
                        />
                        <Input
                            name="serie"
                            placeholder="Filtrar por série..."
                            value={filters.serie}
                            onChange={handleFilterChange}
                        />
                        <Input
                            name="classe"
                            placeholder="Filtrar por classe..."
                            value={filters.classe}
                            onChange={handleFilterChange}
                        />
                        <Input
                            name="turno"
                            placeholder="Filtrar por turno..."
                            value={filters.turno}
                            onChange={handleFilterChange}
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
                            <X className="w-4 h-4 mr-2" />
                            Limpar Filtros
                        </Button>
                    )}
                </CardContent>
            </Card>
      </div>
      <StudentTable
        students={displayedStudents}
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
        onRowClick={handleStudentSelect}
        isLoading={isLoading}
        isSearching={hasActiveFilters}
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