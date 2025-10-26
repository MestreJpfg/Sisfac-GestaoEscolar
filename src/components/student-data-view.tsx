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

  const buildQuery = useCallback((forCount: boolean = false): Query<DocumentData> => {
      let constraints: QueryConstraint[] = [];
      
      if (filters.serie) constraints.push(where("serie", "==", filters.serie));
      if (filters.turno) constraints.push(where("turno", "==", filters.turno));
      if (filters.classe) constraints.push(where("classe", "==", filters.classe));
      if (filters.transporte_escolar) constraints.push(where("transporte_escolar", "==", true));
      if (filters.nee) constraints.push(where("nee", "!=", null));

      // Simple text search logic (can be improved with more advanced backend)
      if (filters.search) {
        // Firestore doesn't support partial string search natively on multiple fields
        // This is a simplified approach. For better search, use a dedicated search service like Algolia.
        // This query will look for an exact match on 'nome' or 'rm'.
        // To handle partial search, you'd typically fetch more data and filter client-side, or use >= and < range queries.
        // constraints.push(where("nome", ">=", filters.search));
        // constraints.push(where("nome", "<=", filters.search + '\uf8ff'));
      }
      
      if (!forCount) {
        constraints.push(orderBy("nome"));
      }

      return query(studentsCollectionRef, ...constraints);
  }, [filters, studentsCollectionRef]);


  const fetchStudents = useCallback(async (page: number, newFilters?: StudentFiltersState) => {
    setIsLoading(true);
    const currentFilters = newFilters || filters;
    try {
      // Fetch total count based on filters
      const countQuery = buildQuery(true);
      const countSnapshot = await getCountFromServer(countQuery);
      setTotalCount(countSnapshot.data().count);
      
      // Fetch paginated data
      const dataQuery = buildQuery();
      let paginatedQuery = query(dataQuery, limit(PAGE_SIZE));

      if (page > 1 && lastVisible) {
        paginatedQuery = query(dataQuery, startAfter(lastVisible), limit(PAGE_SIZE));
      }
      
      const snapshot = await getDocs(paginatedQuery);
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        const filteredData = studentData.filter(s => 
            s.nome.toLowerCase().includes(searchTerm) || 
            (s.rm && s.rm.toString().toLowerCase().includes(searchTerm))
        );
        setStudents(filteredData);
      } else {
        setStudents(studentData);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
    } catch (error: any) {
      console.error("Error fetching students: ", error);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildQuery, lastVisible, toast]);

  useEffect(() => {
    fetchStudents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (newFilters: StudentFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setLastVisible(null);
    fetchStudents(1, newFilters);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) {
      // Moving to the next page
      fetchStudents(newPage);
    } else {
      // Moving to a previous page requires re-fetching from the beginning
      // Firestore's cursor-based pagination makes it hard to go "back" without re-querying
      setLastVisible(null);
      fetchStudents(1); 
    }
    setCurrentPage(newPage);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

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
