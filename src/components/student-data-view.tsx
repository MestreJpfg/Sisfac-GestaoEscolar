"use client";

import { useState, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, where, orderBy, limit, WhereFilterOp } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Users, Filter, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';

const PAGE_SIZE = 50; 

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [displayedStudents, setDisplayedStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [filters, setFilters] = useState({
    nome: '',
    serie: '',
    classe: '',
    turno: '',
  });

  const studentsCollectionRef = useMemo(() => firestore ? collection(firestore, 'alunos') : null, [firestore]);

  const handleSearch = useCallback(async () => {
    if (!studentsCollectionRef) {
        toast({
            variant: "destructive",
            title: "Erro de Conexão",
            description: "Não foi possível conectar à base de dados."
        });
        return;
    }

    const activeFilters = Object.entries(filters).filter(([, value]) => value.trim() !== '');
    
    if (activeFilters.length === 0) {
        toast({
            variant: "destructive",
            title: "Filtros Vazios",
            description: "Por favor, preencha pelo menos um filtro para realizar a busca.",
        });
        return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setDisplayedStudents([]);

    try {
      let q = query(studentsCollectionRef, orderBy("nome"), limit(PAGE_SIZE));
      
      activeFilters.forEach(([key, value]) => {
          let operator: WhereFilterOp = '==';
          let filterValue: any = value.toUpperCase();
          
          if (key === 'nome') {
             operator = '>=';
          }

          q = query(q, where(key, operator, filterValue));

          if (key === 'nome') {
             q = query(q, where(key, '<=', filterValue + '\uf8ff'));
          }
      });
      
      const querySnapshot = await getDocs(q);
      const results = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (results.length === 0) {
          toast({
              title: "Nenhum resultado",
              description: "Nenhum aluno encontrado com os filtros aplicados.",
          });
      } else if (results.length >= PAGE_SIZE) {
          toast({
              title: "Resultados limitados",
              description: `A mostrar os primeiros ${PAGE_SIZE} resultados. Refine a sua busca se necessário.`,
          });
      }

      setDisplayedStudents(results);

    } catch (error: any) {
      console.error("Erro detalhado ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar alunos",
        description: `Ocorreu um erro ao comunicar com a base de dados. Detalhe: ${error.message}`,
      });
      setDisplayedStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [studentsCollectionRef, filters, toast]);


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
    setDisplayedStudents([]);
    setHasSearched(false);
  }
  
  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');

  return (
    <div className="space-y-6">
       <div className="space-y-4">
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Filter className="w-4 h-4" />
                        <h3 className="text-sm font-semibold">Filtrar Base de Dados</h3>
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
                     <div className="flex items-center justify-between mt-4">
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
                                <X className="w-4 h-4 mr-2" />
                                Limpar Filtros
                            </Button>
                        )}
                        <Button onClick={handleSearch} disabled={isLoading} className="ml-auto">
                            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            {isLoading ? 'A buscar...' : 'Buscar Alunos'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
      </div>
      <StudentTable
        students={displayedStudents}
        isLoading={isLoading}
        hasSearched={hasSearched}
        onRowClick={handleStudentSelect}
      />
      <StudentDetailSheet 
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
