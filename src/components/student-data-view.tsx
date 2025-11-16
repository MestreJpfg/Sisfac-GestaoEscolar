
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { firestore } from '@/firebase';
import { collection, query, getDocs, where, Query, orderBy } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  const [hasSearched, setHasSearched] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serie', direction: 'ascending' });

  const hasActiveFilters = useMemo(() => {
    return debouncedNome.trim().length > 0 || filters.serie || filters.classe || filters.turno || filters.nee;
  }, [debouncedNome, filters.serie, filters.classe, filters.turno, filters.nee]);


  const fetchStudents = useCallback(async () => {
    if (!firestore || !hasActiveFilters) {
      setAllFetchedStudents([]);
      setIsLoading(false);
      if (hasSearched) setHasSearched(false);
      return;
    }

    setIsLoading(true);
    if (!hasSearched) setHasSearched(true);

    try {
        let q: Query = collection(firestore, 'alunos');

        const filterConditions = [
            filters.serie ? where('serie', '==', filters.serie) : null,
            filters.classe ? where('classe', '==', filters.classe) : null,
            filters.turno ? where('turno', '==', filters.turno) : null,
            filters.nee ? where('nee', '!=', false) : null,
        ].filter(Boolean) as any[];
        
        // Add name filter at the end if it exists. Firestore is limited with inequalities.
        const nameSearch = debouncedNome.trim().toUpperCase();

        if (filterConditions.length > 0) {
            q = query(q, ...filterConditions, orderBy('nome'));
        } else if (nameSearch) {
            q = query(q, orderBy('nome'));
        }

        const querySnapshot = await getDocs(q);
        let studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Client-side filtering for name if combined with other filters
        if (nameSearch) {
             studentsData = studentsData.filter(student => 
                student.nome && student.nome.toUpperCase().includes(nameSearch)
            );
        }

        setAllFetchedStudents(studentsData);
    } catch (error: any) {
        console.error("Error searching students:", error);
        if (error.code === 'failed-precondition') {
             toast({
                variant: "destructive",
                title: "Consulta Complexa",
                description: "A sua busca é muito complexa. Tente usar menos filtros ou peça para criar um índice no Firestore."
            });
        } else {
            toast({
                variant: "destructive",
                title: "Erro na Busca",
                description: "Ocorreu um erro ao buscar os alunos. Verifique os filtros e a conexão."
            });
        }
        setAllFetchedStudents([]);
    } finally {
        setIsLoading(false);
    }
  }, [firestore, hasActiveFilters, filters.serie, filters.classe, filters.turno, filters.nee, debouncedNome, toast, hasSearched]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);


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

  const uniqueFilterOptions = useMemo(() => {
    const getUniqueValues = (key: string, data: any[]) => 
      [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    return {
        series: getUniqueValues('serie', sortedStudents),
        classes: getUniqueValues('classe', sortedStudents),
        turnos: getUniqueValues('turno', sortedStudents),
    };
}, [sortedStudents]);


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
    fetchStudents(); // Refetch students after an update
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
        {!isLoading && hasSearched && (
          <p>
            {sortedStudents.length > 0 
              ? `${sortedStudents.length} alunos encontrados.`
              : `Nenhum aluno encontrado com os critérios fornecidos.`}
          </p>
        )}
      </div>

      <StudentTable
        students={sortedStudents}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        onReportCardClick={handleOpenReportCard}
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
    

    

