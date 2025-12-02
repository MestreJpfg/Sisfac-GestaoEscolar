
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';

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
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import StudentReportCardDialog from './student-report-card-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function StudentDataView() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [reportCardStudent, setReportCardStudent] = useState<any | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [totalStudentCount, setTotalStudentCount] = useState(0);
  
  const [filters, setFilters] = useState({
    nome: '',
    ensino: '',
    serie: '',
    classe: '',
    turno: '',
    nee: false,
  });

  const debouncedNome = useDebounce(filters.nome, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nome', direction: 'ascending' });

  // Query for populating filter options
  const allStudentsForFiltersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, 'alunos')) : null, [firestore]);
  const { data: allStudentsForFilters, isLoading: isLoadingAllStudents } = useCollection(allStudentsForFiltersQuery);
  
  useEffect(() => {
    const fetchTotalCount = async () => {
      if (firestore) {
        const coll = collection(firestore, 'alunos');
        const snapshot = await getCountFromServer(coll);
        setTotalStudentCount(snapshot.data().count);
      }
    };
    fetchTotalCount();
  }, [firestore]);


  const uniqueFilterOptions = useMemo(() => {
    if (!allStudentsForFilters) return { ensinos: [], series: [], classes: [], turnos: [] };
    
    const getUniqueValues = (key: string) =>
      [...new Set(allStudentsForFilters.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    return {
        ensinos: getUniqueValues('ensino'),
        series: getUniqueValues('serie'),
        classes: getUniqueValues('classe'),
        turnos: getUniqueValues('turno'),
    };
  }, [allStudentsForFilters]);
  
  const isAnyFilterActive = useMemo(() => {
    return debouncedNome.trim().length >= 3 || filters.ensino || filters.serie || filters.classe || filters.turno || filters.nee;
  }, [debouncedNome, filters]);

  // Main query for the table, only runs when a filter is active
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore || !isAnyFilterActive) return null;

    let q = query(collection(firestore, 'alunos'));

    if (filters.ensino) q = query(q, where('ensino', '==', filters.ensino));
    if (filters.serie) q = query(q, where('serie', '==', filters.serie));
    if (filters.classe) q = query(q, where('classe', '==', filters.classe));
    if (filters.turno) q = query(q, where('turno', '==', filters.turno));
    if (filters.nee) q = query(q, where('nee', '!=', null));
    
    return q;
  }, [firestore, isAnyFilterActive, filters.ensino, filters.serie, filters.classe, filters.turno, filters.nee]);

  const { data: studentsData, isLoading: isLoadingStudents } = useCollection(studentsQuery);

  const filteredAndSortedStudents = useMemo(() => {
    if (!studentsData && isAnyFilterActive) return []; // In case data is null while loading
    
    let filtered = isAnyFilterActive ? studentsData || [] : [];
    const searchLower = debouncedNome.trim().toLowerCase();

    // The name search must be done on the client side because Firestore doesn't support partial text search on its own
    if (searchLower.length >= 3) {
      filtered = filtered.filter(student => student.nome?.toLowerCase().includes(searchLower));
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

  }, [studentsData, isAnyFilterActive, debouncedNome, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  const handleFilterChange = (name: string, value: string | boolean) => {
    const newValue = typeof value === 'string' && value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [name]: newValue }));
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
  };
    
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            name="nome"
            placeholder="Buscar por nome do aluno (mínimo 3 caracteres)..."
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
                  <Select value={filters.ensino || ''} onValueChange={(value) => handleFilterChange('ensino', value)} disabled={isLoadingAllStudents}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingAllStudents ? <div className='flex items-center gap-2'><Loader2 className="h-4 w-4 animate-spin"/> A carregar...</div> : "Filtrar por ensino..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os ensinos</SelectItem>
                      {uniqueFilterOptions.ensinos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.serie || ''} onValueChange={(value) => handleFilterChange('serie', value)} disabled={isLoadingAllStudents}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? <div className='flex items-center gap-2'><Loader2 className="h-4 w-4 animate-spin"/> A carregar...</div> : "Filtrar por série..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {uniqueFilterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.classe || ''} onValueChange={(value) => handleFilterChange('classe', value)} disabled={isLoadingAllStudents}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? <div className='flex items-center gap-2'><Loader2 className="h-4 w-4 animate-spin"/> A carregar...</div> : "Filtrar por classe..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as classes</SelectItem>
                      {uniqueFilterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.turno || ''} onValueChange={(value) => handleFilterChange('turno', value)} disabled={isLoadingAllStudents}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? <div className='flex items-center gap-2'><Loader2 className="h-4 w-4 animate-spin"/> A carregar...</div> : "Filtrar por turno..."} />
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
              
              {isAnyFilterActive && (
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
         {isAnyFilterActive && !isLoadingStudents && (
          `A exibir ${filteredAndSortedStudents.length} de ${totalStudentCount} aluno(s).`
        )}
      </div>
      
      <StudentTable
          students={filteredAndSortedStudents}
          onRowClick={handleStudentSelect}
          onReportCardClick={handleOpenReportCard}
          onSort={handleSort}
          sortConfig={sortConfig}
          isLoading={isLoadingStudents}
          isSearchActive={isAnyFilterActive}
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
