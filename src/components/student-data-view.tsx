"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import StudentTable from './student-table';
import { Filter, X, ChevronDown } from 'lucide-react';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { SortConfig } from './student-table';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

export default function StudentDataView() {
  const firestore = useFirestore();

  const [allFetchedStudents, setAllFetchedStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

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

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serie', direction: 'ascending' });


  useEffect(() => {
    if (!firestore) return;

    const fetchUniqueOptions = async () => {
      try {
        const studentsCollectionRef = collection(firestore, 'alunos');
        const querySnapshot = await getDocs(query(studentsCollectionRef)); 
        
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
        if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
          const permissionError = new FirestorePermissionError({
            path: 'alunos',
            operation: 'list'
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      }
    };

    fetchUniqueOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);


  const searchStudents = useCallback(async () => {
    if (!firestore) return;

    const nameSearch = debouncedNome.trim().toUpperCase();
    const hasNameSearch = nameSearch.length >= 3;
    const hasOtherFilters = !!(filters.serie || filters.classe || filters.turno);

    if (!hasNameSearch && !hasOtherFilters) {
      setAllFetchedStudents([]);
      setHasSearched(false);
      return;
    }
    
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const baseQuery = collection(firestore, 'alunos');
      let conditions = [];
      
      if (filters.serie) {
        conditions.push(where('serie', '==', filters.serie));
      }
      if (filters.classe) {
        conditions.push(where('classe', '==', filters.classe));
      }
      if (filters.turno) {
        conditions.push(where('turno', '==', filters.turno));
      }
      
      const finalQuery = conditions.length > 0 ? query(baseQuery, ...conditions) : query(baseQuery);

      const querySnapshot = await getDocs(finalQuery);
      
      let studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (hasNameSearch) {
        studentsData = studentsData.filter(student => 
            student.nome && student.nome.toUpperCase().includes(nameSearch)
        );
      }

      setAllFetchedStudents(studentsData);

    } catch (error: any) {
      if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
        const permissionError = new FirestorePermissionError({
            path: 'alunos', // Path is simplified for query errors
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      setAllFetchedStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [firestore, debouncedNome, filters.serie, filters.classe, filters.turno]);

  useEffect(() => {
    searchStudents();
  }, [searchStudents]);

  const sortedStudents = useMemo(() => {
    let sortableItems = [...allFetchedStudents];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        // Tratar "SIM" / "NÃO" para nee
        if (sortConfig.key === 'nee') {
            const valA = a.nee ? 1 : 0;
            const valB = b.nee ? 1 : 0;
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, 'pt-BR', { numeric: true });
          return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

     // Adiciona um segundo critério de ordenação por nome
    if (sortConfig.key !== 'nome') {
        sortableItems.sort((a, b) => {
             if (a[sortConfig.key] === b[sortConfig.key]) {
                return a.nome.localeCompare(b.nome, 'pt-BR');
            }
            return 0;
        });
    }

    return sortableItems;
  }, [allFetchedStudents, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
  };

  const clearFilters = () => {
    setFilters({
      nome: '',
      serie: '',
      classe: '',
      turno: '',
    });
    setAllFetchedStudents([]);
    setHasSearched(false);
  }

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const handleStudentUpdate = () => {
    searchStudents();
    handleCloseSheet();
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== '');
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            name="nome"
            placeholder="Digite 3+ letras do nome para buscar..."
            value={filters.nome}
            onChange={(e) => handleFilterChange('nome', e.target.value)}
          />

          <Collapsible open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-0 text-sm font-semibold text-primary">
                 <Filter className="w-4 h-4 mr-2" />
                 Filtros Avançados
                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isAdvancedSearchOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select value={filters.serie || ''} onValueChange={(value) => handleFilterChange('serie', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por série..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {uniqueFilterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.classe || ''} onValueChange={(value) => handleFilterChange('classe', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por classe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as classes</SelectItem>
                      {uniqueFilterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.turno || ''} onValueChange={(value) => handleFilterChange('turno', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por turno..." />
                    </Trigger>
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
                    Limpar Todos os Filtros
                  </Button>
                </div>
              )}

            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground h-5">
        {hasSearched && !isLoading && (
          <p>
            {sortedStudents.length > 0 
              ? `Encontrados ${sortedStudents.length} alunos.`
              : `Nenhum aluno encontrado com os critérios fornecidos.`}
          </p>
        )}
      </div>

      <StudentTable
        students={sortedStudents}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        hasSearched={hasSearched}
        onSort={handleSort}
        sortConfig={sortConfig}
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
