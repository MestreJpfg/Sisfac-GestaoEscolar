"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, getCountFromServer, orderBy, DocumentData, Query } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 50;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const studentsCollectionRef = useMemo(() => collection(firestore, 'alunos'), [firestore]);

  const fetchStudents = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    try {
      if (!firestore) return;

      // Fetch total count once
      if (totalCount === 0) {
        const countQuery = query(studentsCollectionRef);
        const countSnapshot = await getCountFromServer(countQuery);
        setTotalCount(countSnapshot.data().count);
      }
      
      let dataQuery: Query;

      if (direction === 'next' && lastVisible) {
        dataQuery = query(studentsCollectionRef, orderBy("nome"), startAfter(lastVisible), limit(PAGE_SIZE));
      } else {
         // For 'first' or 'prev' (as Firestore doesn't have `endBefore`), we start from the beginning.
         // A more complex implementation for 'prev' would be needed, for now we reset.
        dataQuery = query(studentsCollectionRef, orderBy("nome"), limit(PAGE_SIZE));
      }
      
      const snapshot = await getDocs(dataQuery);
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStudents(studentData);
      setFirstVisible(snapshot.docs[0] || null);
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
  }, [firestore, studentsCollectionRef, lastVisible, totalCount, toast]);

  // Initial load
  useEffect(() => {
    fetchStudents('first');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]); // Dependency is firestore now, not the full fetchStudents function

  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) {
        fetchStudents('next');
    } else if (newPage < currentPage) {
        // Simple pagination: reset to first page for "previous"
        // A true 'prev' is more complex and requires reversing the query.
        setCurrentPage(1);
        setLastVisible(null);
        fetchStudents('first');
        return; // exit to avoid setting page below
    }
    setCurrentPage(newPage);
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
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
