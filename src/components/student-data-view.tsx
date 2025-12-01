
'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, limit, collectionGroup } from 'firebase/firestore';

import StudentTable from './student-table';
import { Filter, X, ChevronDown, Search, Loader2 } from 'lucide-react';
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
  const firestore = useFirestore();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [reportCardStudent, setReportCardStudent] = useState<any | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    nome: '',
    ensino: '',
    serie: '',
    classe: '',
    turno: '',
    nee: false,
  });

  const debouncedNome = useDebounce(filters.nome, 400);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nome', direction: 'ascending' });

  // Query to get all students for filter options. This can be slow and should be optimized if performance is an issue.
  const allStudentsForOptionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alunos'));
  }, [firestore]);
  const { data: allStudentsDataForOptions, isLoading: isLoadingOptions } = useCollection(allStudentsForOptionsQuery);


  const hasActiveFilters = useMemo(() => {
    return filters.ensino || filters.serie || filters.classe || filters.turno || filters.nee || debouncedNome.length >= 3;
  }, [filters, debouncedNome]);

  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !hasActiveFilters) return null;

    let q = query(collection(firestore, 'alunos'));

    if (filters.ensino) {
      q = query(q, where('ensino', '==', filters.ensino));
    }
    if (filters.serie) {
      q = query(q, where('serie', '==', filters.serie));
    }
    if (filters.classe) {
      q = query(q, where('classe', '==', filters.classe));
    }
    if (filters.turno) {
      q = query(q, where('turno', '==', filters.turno));
    }
    if (filters.nee) {
        q = query(q, where('nee', '!=', null));
    }
    if (debouncedNome.length >= 3) {
      // Firestore does not support partial string matching. We have to filter this on the client.
      // Or use a more complex solution like Algolia/Elasticsearch.
    }
    
    return q;
  }, [firestore, hasActiveFilters, debouncedNome, filters]);

  const { data: studentsData, isLoading: isLoadingStudents, refetch } = useCollection(studentsQuery);


  const uniqueFilterOptions = useMemo(() => {
    const dataForOptions = allStudentsDataForOptions || [];
    const getUniqueValues = (key: string, data: any[]) =>
      [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    let filteredData = dataForOptions;
    const ensinos = getUniqueValues('ensino', filteredData);

    if (filters.ensino) filteredData = filteredData.filter(s => s.ensino === filters.ensino);
    const series = getUniqueValues('serie', filteredData);

    if (filters.serie) filteredData = filteredData.filter(s => s.serie === filters.serie);
    const classes = getUniqueValues('classe', filteredData);

    if(filters.classe) filteredData = filteredData.filter(s => s.classe === filters.classe);
    const turnos = getUniqueValues('turno', filteredData);

    return { ensinos, series, classes, turnos };
  }, [allStudentsDataForOptions, filters]);
  

  const filteredAndSortedStudents = useMemo(() => {
    if (!studentsData) {
        return [];
    }

    let filteredStudents = studentsData;
    const searchLower = debouncedNome.trim().toLowerCase();

    if (searchLower.length >= 3) {
      filteredStudents = filteredStudents.filter(student => student.nome?.toLowerCase().includes(searchLower));
    }

    const sortedStudents = [...filteredStudents].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    return sortedStudents;
  }, [studentsData, debouncedNome, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  const handleFilterChange = (name: string, value: string | boolean) => {
    const newValue = typeof value === 'string' && value === 'all' ? '' : value;
    
    setFilters(prev => {
        const newFilters = { ...prev, [name]: newValue };
        if (name === 'ensino') {
            newFilters.serie = '';
            newFilters.classe = '';
            newFilters.turno = '';
        } else if (name === 'serie') {
            newFilters.classe = '';
            newFilters.turno = '';
        } else if (name === 'classe') {
            newFilters.turno = '';
        }
        return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      nome: '',
      ensino: '',
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
    toast({
        title: "Atualização em andamento...",
        description: "Os dados do aluno estão sendo atualizados na lista.",
    });
    refetch();
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            name="nome"
            placeholder="Buscar por nome (mínimo 3 caracteres)..."
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select value={filters.ensino || ''} onValueChange={(value) => handleFilterChange('ensino', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por ensino..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os ensinos</SelectItem>
                      {uniqueFilterOptions.ensinos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.serie || ''} onValueChange={(value) => handleFilterChange('serie', value)} disabled={!filters.ensino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por série..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {uniqueFilterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      <SelectItem value="N/A">Não Definida</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.classe || ''} onValueChange={(value) => handleFilterChange('classe', value)} disabled={!filters.serie}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar por classe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as classes</SelectItem>
                      {uniqueFilterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.turno || ''} onValueChange={(value) => handleFilterChange('turno', value)} disabled={!filters.classe}>
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
        {hasActiveFilters && !isLoadingStudents && (
            <p>
                {filteredAndSortedStudents.length > 0
                  ? `A exibir ${filteredAndSortedStudents.length} aluno(s) encontrado(s).`
                  : 'Nenhum aluno encontrado com os critérios fornecidos.'
                }
            </p>
        )}
      </div>
      
        <StudentTable
            students={filteredAndSortedStudents}
            onRowClick={handleStudentSelect}
            onReportCardClick={handleOpenReportCard}
            onSort={handleSort}
            sortConfig={sortConfig}
            hasSearched={hasActiveFilters}
            isLoading={hasActiveFilters && isLoadingStudents}
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
