"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useDebounce } from '@/hooks/use-debounce';

const PAGE_SIZE = 20;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [filters, setFilters] = useState({
    nome: '',
    serie: '',
    classe: '',
    turno: '',
  });

  const debouncedNome = useDebounce(filters.nome, 500);

  const [uniqueFilterOptions, setUniqueFilterOptions] = useState<{ series: string[], classes: string[], turnos: string[] }>({
    series: [],
    classes: [],
    turnos: [],
  });

  const [hasSearched, setHasSearched] = useState(false);

  // This effect will fetch unique options for the dropdowns ONCE on component mount
  useEffect(() => {
    const fetchUniqueOptions = async () => {
      if (!firestore) return;
      try {
        const studentsCollectionRef = collection(firestore, 'alunos');
        const querySnapshot = await getDocs(query(studentsCollectionRef, limit(1000))); // Sample for performance
        
        const series = new Set<string>();
        const classes = new Set<string>();
        const turnos = new Set<string>();
        querySnapshot.docs.forEach(doc => {
          const student = doc.data();
          if (student.serie && String(student.serie).trim() !== '') series.add(String(student.serie));
          if (student.classe && String(student.classe).trim() !== '') classes.add(String(student.classe));
          if (student.turno && String(student.turno).trim() !== '') turnos.add(String(student.turno));
        });
        setUniqueFilterOptions({
          series: Array.from(series).sort(),
          classes: Array.from(classes).sort(),
          turnos: Array.from(turnos).sort(),
        });
      } catch (error) {
        console.error("Erro ao buscar opções de filtro:", error);
      }
    };
    fetchUniqueOptions();
  }, [firestore]);


  const searchStudents = useCallback(async () => {
    // Only search if the name filter is not empty
    if (!firestore || !debouncedNome.trim()) {
      setStudents([]);
      if(debouncedNome.trim() === '' && (filters.serie || filters.classe || filters.turno)) {
        // do nothing, user has not typed a name
      } else {
         setHasSearched(false);
      }
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      let q = query(
        collection(firestore, 'alunos'),
        // Firestore requires the first orderBy to match the inequality filter
        orderBy('nome'), 
        where('nome', '>=', debouncedNome.toUpperCase()),
        where('nome', '<=', debouncedNome.toUpperCase() + '\uf8ff')
      );

      if (filters.serie) {
        q = query(q, where('serie', '==', filters.serie));
      }
      if (filters.classe) {
        q = query(q, where('classe', '==', filters.classe));
      }
      if (filters.turno) {
        q = query(q, where('turno', '==', filters.turno));
      }

      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);

    } catch (error: any) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: "Não foi possível realizar a busca na base de dados.",
      });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast, debouncedNome, filters.serie, filters.classe, filters.turno]);

  useEffect(() => {
    searchStudents();
  }, [searchStudents]);


  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    if(name === 'nome' && value.trim() === ''){
      setHasSearched(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      nome: '',
      serie: '',
      classe: '',
      turno: '',
    });
    setStudents([]);
    setHasSearched(false);
  }

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const handleStudentUpdate = () => {
    // Re-fetch data to ensure table is up-to-date after an edit
    searchStudents();
    handleCloseSheet();
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Filtrar Base de Dados</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              name="nome"
              placeholder="Digite um nome para buscar..."
              value={filters.nome}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
            />
            <Select value={filters.serie || 'all'} onValueChange={(value) => handleFilterChange('serie', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por série..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as séries</SelectItem>
                {uniqueFilterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.classe || 'all'} onValueChange={(value) => handleFilterChange('classe', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por classe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as classes</SelectItem>
                {uniqueFilterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.turno || 'all'} onValueChange={(value) => handleFilterChange('turno', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por turno..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os turnos</SelectItem>
                {uniqueFilterOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <div className="flex items-center justify-end mt-4">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive hover:text-destructive">
                <X className="w-4 h-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground">
        {hasSearched && !isLoading && (
          <p>
            {students.length > 0 
              ? `Encontrados ${students.length} alunos.`
              : `Nenhum aluno encontrado com os critérios fornecidos.`}
          </p>
        )}
      </div>

      <StudentTable
        students={students}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        hasSearched={hasSearched}
      />
      
      <StudentDetailSheet
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={handleCloseSheet}
        onUpdate={handleStudentUpdate}
      />
    </div>
  );
}
