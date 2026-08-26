'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';

import StudentTable from './student-table';
import { Filter, X, ChevronDown, Loader2 } from 'lucide-react';
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

  const debouncedNome = useDebounce(filters.nome, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nome', direction: 'ascending' });

  const studentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'alunos'));
  }, [firestore]);

  const { data: allStudentsData, isLoading: isLoadingAllStudents } = useCollection(studentsQuery);

  const allStudents = useMemo(() => {
    return (allStudentsData || []).filter(s => !s.status || s.status === 'ATIVO');
  }, [allStudentsData]);

  // Normalização agressiva incluindo remoção de acentos para matching perfeito
  const normalize = (val: any) => 
    String(val || '')
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

  const uniqueFilterOptions = useMemo(() => {
    if (!allStudents || allStudents.length === 0) {
        return { ensinos: [], series: [], classes: [], turnos: [] };
    }

    const getUniqueValues = (key: string, data: any[]) =>
      [...new Set(data.map(s => String(s[key] || '').trim().toUpperCase()).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    const ensinos = getUniqueValues('ensino', allStudents);
    
    let studentsForSeries = allStudents;
    if (filters.ensino) {
        studentsForSeries = studentsForSeries.filter(s => normalize(s.ensino) === normalize(filters.ensino));
    }
    const series = getUniqueValues('serie', studentsForSeries);
    
    let studentsForClasses = studentsForSeries;
    if (filters.serie) {
        studentsForClasses = studentsForClasses.filter(s => normalize(s.serie) === normalize(filters.serie));
    }
    const classes = getUniqueValues('classe', studentsForClasses);
    
    let studentsForTurnos = studentsForClasses;
    if (filters.classe) {
        studentsForTurnos = studentsForTurnos.filter(s => normalize(s.classe) === normalize(filters.classe));
    }
    const turnos = getUniqueValues('turno', studentsForTurnos);

    return { ensinos, series, classes, turnos };
  }, [allStudents, filters.ensino, filters.serie, filters.classe]);

  
  const isAnyFilterActive = useMemo(() => {
    return debouncedNome.trim().length >= 3 || filters.ensino || filters.serie || filters.classe || filters.turno || filters.nee;
  }, [debouncedNome, filters]);

  
  const filteredAndSortedStudents = useMemo(() => {
    if (!isAnyFilterActive) return [];
    
    const searchLower = normalize(debouncedNome);

    const filtered = allStudents.filter(student => {
        if (filters.ensino && normalize(student.ensino) !== normalize(filters.ensino)) return false;
        if (filters.serie && normalize(student.serie) !== normalize(filters.serie)) return false;
        if (filters.classe && normalize(student.classe) !== normalize(filters.classe)) return false;
        if (filters.turno && normalize(student.turno) !== normalize(filters.turno)) return false;
        if (filters.nee && !student.nee) return false;
        if (searchLower.length >= 3 && !normalize(student.nome).includes(searchLower)) return false;
        return true;
    });
    
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

  }, [allStudents, isAnyFilterActive, debouncedNome, filters, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };

  const handleFilterChange = (name: string, value: string | boolean) => {
    setFilters(prev => {
        const newFilters = { ...prev, [name]: (typeof value === 'string' && value === 'all' ? '' : value) };
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

  const handleStudentUpdate = (updatedStudentData: any) => {
    // A sincronização em tempo real cuida disso automaticamente via useCollection
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
                      <SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por ensino..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os ensinos</SelectItem>
                      {uniqueFilterOptions.ensinos.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.serie || ''} onValueChange={(value) => handleFilterChange('serie', value)} disabled={isLoadingAllStudents || !filters.ensino}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por série..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as séries</SelectItem>
                      {uniqueFilterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.classe || ''} onValueChange={(value) => handleFilterChange('classe', value)} disabled={isLoadingAllStudents || !filters.serie}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por classe..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as classes</SelectItem>
                      {uniqueFilterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filters.turno || ''} onValueChange={(value) => handleFilterChange('turno', value)} disabled={isLoadingAllStudents || !filters.classe}>
                    <SelectTrigger>
                       <SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por turno..."} />
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
         {isAnyFilterActive && !isLoadingAllStudents && (
          `A exibir ${filteredAndSortedStudents.length} de ${allStudents.length} aluno(s) ativos.`
        )}
      </div>
      
      <StudentTable
          students={filteredAndSortedStudents}
          onRowClick={handleStudentSelect}
          onReportCardClick={handleOpenReportCard}
          onSort={handleSort}
          sortConfig={sortConfig}
          isLoading={isLoadingAllStudents && isAnyFilterActive}
          isSearchActive={isAnyFilterActive}
      />
      
      <StudentDetailSheet
        student={selectedStudent}
        allStudents={allStudents}
        isOpen={!!selectedStudent}
        onClose={handleCloseSheet}
        onUpdate={() => {}}
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
