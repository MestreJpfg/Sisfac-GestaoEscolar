"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, limit, startAfter, getCountFromServer, orderBy, DocumentData, Query as FirestoreQuery } from 'firebase/firestore';
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

  const studentsCollectionRef = useMemo(() => firestore ? collection(firestore, 'alunos') : null, [firestore]);

  const fetchStudents = useCallback(async (direction: 'next' | 'prev' | 'first' = 'first') => {
    if (!studentsCollectionRef) return;
    setIsLoading(true);

    try {
      // Fetch total count only once if not already fetched
      if (totalCount === 0) {
        const countSnapshot = await getCountFromServer(studentsCollectionRef);
        setTotalCount(countSnapshot.data().count);
      }
      
      let dataQuery: FirestoreQuery;

      if (direction === 'next' && lastVisible) {
        dataQuery = query(studentsCollectionRef, orderBy("nome"), startAfter(lastVisible), limit(PAGE_SIZE));
        setCurrentPage(prev => prev + 1);
      } else { // 'first' or 'prev'
        dataQuery = query(studentsCollectionRef, orderBy("nome"), limit(PAGE_SIZE));
        setCurrentPage(1);
      }
      
      const snapshot = await getDocs(dataQuery);
      
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStudents(studentData);
      setFirstVisible(snapshot.docs[0] || null);
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
    // Firestore doesn't easily support previous page with startAfter.
    // The simplest way is to reset to the first page.
    fetchStudents('first');
  };

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      {isLoading && students.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      ) : (
        <StudentTable
          students={students}
          currentPage={currentPage}
          totalPages={totalPages}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
