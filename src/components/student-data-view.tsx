
"use client";

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/firebase';
import { collection, query, getDocs, where, limit, Query } from 'firebase/firestore';
import StudentTable from './student-table';
import { Filter, X, ChevronDown, AlertTriangle } from 'lucide-react';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { SortConfig } from './student-table';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import StudentReportCardDialog from './student-report-card-dialog';
import { useToast } from '@/hooks/use-toast';

export default function StudentDataView() {
  const { toast } = useToast();

  const [allFetchedStudents, setAllFetchedStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [reportCardStudent, setReportCardStudent] = useState<any | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);

  const [filters, setFilters] = useState({
    nome: '',
    serie: '',
    classe: '',
    turno: '',
    nee: false,
  });

  const debouncedNome = useDebounce(filters.nome, 500);
  
  const [uniqueFilterOptions, setUniqueFilterOptions] = useState<{ series: string[], classes: string[], turnos: string[] }>({
    series: [],
    classes: [],
    turnos: [],
  });

  const [hasSearched, setHasSearched] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serie', direction: 'ascending' });

  // Fetch unique filter options on mount
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
        console.error("Error fetching unique options:", error);
        toast({
            variant: "destructive",
            title: "Erro ao carregar filtros",
            description: "Não foi possível buscar as opções de filtro da base de dados."
        });
      }
    };

    fetchUniqueOptions();
  }, [firestore, toast]);

  const studentsQuery = useMemo(() => {
    if (!firestore) return null;

    const baseQuery = collection(firestore, 'alunos');
    let conditions = [];

    if (filters.serie) conditions.push(where('serie', '==', filters.serie));
    if (filters.classe) conditions.push(where('classe', '==', filters.classe));
    if (filters.turno) conditions.push(where('turno', '==', filters.turno));
    if (filters.nee) conditions.push(where('nee', '!=', null));
    
    // If no filters and no name search, load initial data
    const hasActiveFilters = conditions.length > 0 || debouncedNome.trim().length >= 3;
    
    if (conditions.length > 0) {
      return query(baseQuery, ...conditions);
    }
    
    if (!hasActiveFilters) {
      return query(baseQuery, limit(200));
    }
    
    // For name search, we fetch all and filter client-side as Firestore doesn't support partial string match on its own.
    // If other filters are active, we respect them. If not, we query the whole collection.
    return query(baseQuery);
  }, [firestore, filters.serie, filters.classe, filters.turno, filters.nee, debouncedNome]);

  // Effect to fetch students based on the memoized query
  useEffect(() => {
    const searchStudents = async () => {
      if (!studentsQuery) return;

      setIsLoading(true);
      setHasSearched(true);
        
      try {
        const querySnapshot = await getDocs(studentsQuery);
        let studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const nameSearch = debouncedNome.trim().toUpperCase();
        if (nameSearch.length >= 3) {
          studentsData = studentsData.filter(student => 
              student.nome && student.nome.toUpperCase().includes(nameSearch)
          );
        }

        setAllFetchedStudents(studentsData);
      } catch (error: any) {
          console.error("Error searching students:", error);
          toast({
              variant: "destructive",
              title: "Erro na Busca",
              description: "Ocorreu um erro ao buscar os alunos. Verifique os filtros e a conexão."
          });
          setAllFetchedStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchStudents();
  }, [studentsQuery, debouncedNome, toast]);

  const sortedStudents = useMemo(() => {
    let sortableItems = [...allFetchedStudents];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

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

  const handleFilterChange = (name: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [name]: typeof value === 'string' && value === 'all' ? '' : value }));
  };


  const clearFilters = () => {
    setFilters({
      nome: '',
      serie: '',
      classe: '',
      turno: '',
      nee: false,
    });
  };

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleOpenReportCard = (student: any) => {
    setReportCardStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const handleStudentUpdate = () => {
    // This will trigger a refetch because the query depends on filters that may have changed.
    // To force a refetch even if filters didn't change, we could add a manual trigger.
    // For now, this is sufficient as updates happen in a dialog and this component re-evaluates.
  };


  const hasActiveFilters = Object.values(filters).some(val => val) || filters.nome.length > 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            name="nome"
            placeholder="Buscar por nome..."
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
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os turnos</SelectItem>
                      {uniqueFilterOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
              </div>

               <div className="flex items-center space-x-2 rounded-md border p-3 mt-4">
                <Switch 
                  id="nee-filter" 
                  checked={filters.nee}
                  onCheckedChange={(checked) => handleFilterChange('nee', checked)}
                />
                <Label htmlFor="nee-filter" className="flex items-center cursor-pointer">
                  <AlertTriangle className="w-4 h-4 mr-2 text-destructive" />
                  Mostrar apenas alunos com NEE
                </Label>
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
        {!isLoading && (
          <p>
            {sortedStudents.length > 0 
              ? `${sortedStudents.length} alunos exibidos.`
              : hasSearched ? `Nenhum aluno encontrado com os critérios fornecidos.` : ''}
          </p>
        )}
      </div>

      <StudentTable
        students={sortedStudents}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        onReportCardClick={handleOpenReportCard}
        hasActiveFilters={hasActiveFilters}
        onSort={handleSort}
        sortConfig={sortConfig}
      />
      
      <StudentDetailSheet
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={handleCloseSheet}
        onUpdate={handleStudentUpdate}
      />

      {reportCardStudent && (
        <StudentReportCardDialog
            isOpen={!!reportCardStudent}
            onClose={() => setReportCardStudent(null)}
            boletim={reportCardStudent.boletim || {}}
            student={reportCardStudent}
        />
      )}
    </div>
  );
}

    