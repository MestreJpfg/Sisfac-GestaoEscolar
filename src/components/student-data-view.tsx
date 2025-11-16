'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { firestore, useUser } from '@/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
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
import { useCollection } from '@/firebase/firestore/use-collection';

export default function StudentDataView() {
  const { toast } = useToast();
  const { isUserLoading } = useUser();
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

  const debouncedNome = useDebounce(filters.nome, 300);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serie', direction: 'ascending' });

  // Memoize the Firestore query to ensure it's stable across re-renders
  const studentsQuery = useMemo(() => {
    if (isUserLoading || !firestore) {
      return null;
    }
    return query(collection(firestore, 'alunos'), orderBy('nome'));
  }, [isUserLoading, firestore]);

  // useCollection will handle loading, error, and data fetching automatically
  const { data: allStudents, isLoading, error } = useCollection(studentsQuery);

  useEffect(() => {
    if (error) {
      console.error("Error fetching students:", error);
      toast({
        variant: "destructive",
        title: "Erro na Busca",
        description: "Ocorreu um erro ao buscar os alunos. Verifique a sua conexão e as permissões do Firestore."
      });
    }
  }, [error, toast]);


  const filteredAndSortedStudents = useMemo(() => {
    if (!allStudents) {
      return [];
    }
    let filtered = [...allStudents];

    // Client-side filtering
    const nameSearch = debouncedNome.trim().toUpperCase();
    if (nameSearch) {
      filtered = filtered.filter(student =>
        student.nome && student.nome.toUpperCase().includes(nameSearch)
      );
    }
    if (filters.serie) {
      filtered = filtered.filter(s => s.serie === filters.serie);
    }
    if (filters.classe) {
      filtered = filtered.filter(s => s.classe === filters.classe);
    }
    if (filters.turno) {
      filtered = filtered.filter(s => s.turno === filters.turno);
    }
    if (filters.nee) {
      filtered = filtered.filter(s => s.nee);
    }

    // Sorting
    if (sortConfig.key !== null) {
      filtered.sort((a, b) => {
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

    // Secondary sort by name if primary sort key is the same
    if (sortConfig.key !== 'nome') {
        filtered.sort((a, b) => {
             if (a[sortConfig.key] === b[sortConfig.key]) {
                return a.nome.localeCompare(b.nome, 'pt-BR');
            }
            return 0;
        });
    }

    return filtered;
  }, [allStudents, debouncedNome, filters, sortConfig]);

  const uniqueFilterOptions = useMemo(() => {
    const getUniqueValues = (key: string, data: any[]) => 
      [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    return {
        series: getUniqueValues('serie', allStudents || []),
        classes: getUniqueValues('classe', allStudents || []),
        turnos: getUniqueValues('turno', allStudents || []),
    };
  }, [allStudents]);

  const hasActiveFilters = useMemo(() => {
    return debouncedNome.trim().length > 0 || filters.serie || filters.classe || filters.turno || filters.nee;
  }, [debouncedNome, filters]);

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
    // Data is refetched automatically by useCollection on Firestore updates
    // but we can add a toast or other feedback here if needed
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
        {!isLoading && allStudents && (
          <p>
            {filteredAndSortedStudents.length > 0 
              ? `${filteredAndSortedStudents.length} de ${allStudents.length} alunos encontrados.`
              : hasActiveFilters
              ? `Nenhum aluno encontrado com os critérios fornecidos.`
              : `${allStudents.length} alunos carregados.`}
          </p>
        )}
      </div>

      <StudentTable
        students={filteredAndSortedStudents}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        onReportCardClick={handleOpenReportCard}
        hasSearched={true} // We can simplify this prop now
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
    
