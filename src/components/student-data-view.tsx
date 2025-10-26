"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, limit, startAfter, getCountFromServer, orderBy, QueryConstraint, DocumentData, Query } from 'firebase/firestore';
import StudentFilters, { type StudentFiltersState } from './student-filters';
import StudentTable from './student-table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 20;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [filters, setFilters] = useState<StudentFiltersState>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const studentsCollectionRef = useMemo(() => collection(firestore, 'alunos'), [firestore]);

  const buildQuery = useCallback((currentFilters: StudentFiltersState, forCount: boolean = false): Query<DocumentData> => {
    let constraints: QueryConstraint[] = [];
    const isFiltered = Object.values(currentFilters).some(v => v !== undefined && v !== '');

    if (currentFilters.serie) constraints.push(where("serie", "==", currentFilters.serie));
    if (currentFilters.turno) constraints.push(where("turno", "==", currentFilters.turno));
    if (currentFilters.classe) constraints.push(where("classe", "==", currentFilters.classe));
    if (currentFilters.transporte_escolar) constraints.push(where("transporte_escolar", "==", true));
    if (currentFilters.nee) constraints.push(where("nee", "!=", null));
    
    // Only order by name if there are no filters applied.
    // This simplifies index requirements. Complex filtering + ordering needs specific composite indexes.
    if (!forCount && !isFiltered) {
      constraints.push(orderBy("nome"));
    }

    return query(studentsCollectionRef, ...constraints);
  }, [studentsCollectionRef]);


  const fetchStudents = useCallback(async (page: number, newFilters: StudentFiltersState) => {
    setIsLoading(true);
    try {
      // Use the new filters immediately for the query build
      const finalFilters = newFilters;

      // Fetch total count based on filters
      const countQuery = buildQuery(finalFilters, true);
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalCount(countSnapshot.data().count);
      
      // Fetch paginated data
      const dataQuery = buildQuery(finalFilters, false);
      let paginatedQuery = query(dataQuery, limit(PAGE_SIZE));
      
      // Only use pagination cursor if we are on a subsequent page *with the same filters*
      if (page > 1 && lastVisible) {
        paginatedQuery = query(dataQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }
      
      const snapshot = await getDocs(paginatedQuery);
      let studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Client-side search and sorting if filters are active
      const isFiltered = Object.values(finalFilters).some(v => v !== undefined && v !== '');
      
      if (finalFilters.search) {
        const searchTerm = finalFilters.search.toLowerCase();
        studentData = studentData.filter(s => 
            s.nome?.toLowerCase().includes(searchTerm) || 
            (s.rm && s.rm.toString().toLowerCase().includes(searchTerm))
        );
      }

      // If filters are applied, sort client-side as we removed server-side orderBy
      if (isFiltered) {
        studentData.sort((a, b) => {
          if (a.nome && b.nome) {
            return a.nome.localeCompare(b.nome);
          }
          if (a.nome) return -1; // a comes first
          if (b.nome) return 1;  // b comes first
          return 0; // both are missing name
        });
      }

      setStudents(studentData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (error: any) {
      console.error("Erro detalhado ao buscar alunos:", error.stack || error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar alunos",
        description: error.message || "Ocorreu um erro ao comunicar com a base de dados.",
      });
      setStudents([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildQuery, lastVisible, toast]);

  useEffect(() => {
    // Initial load with no filters
    fetchStudents(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleFilterChange = (newFilters: StudentFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setLastVisible(null); // Reset pagination on new filter
    fetchStudents(1, newFilters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) {
        fetchStudents(newPage, filters);
    } else {
        // Firestore cursor pagination doesn't easily support "previous".
        // Re-fetching from the start is the simplest way.
        setLastVisible(null);
        fetchStudents(1, filters);
    }
    setCurrentPage(newPage);
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <StudentFilters onFilterChange={handleFilterChange} />

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      ) : (
        <StudentTable
          students={students}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
