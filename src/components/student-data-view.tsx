
'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@/firebase';
import StudentTable from './student-table';
import { Filter, X, ChevronDown, AlertTriangle, Search } from 'lucide-react';
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

export default function StudentDataView({ allStudents }: { allStudents: any[] }) {
  const { toast } = useToast();
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
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'serie', direction: 'ascending' });

  const hasActiveFilters = useMemo(() => {
    return debouncedNome.trim().length >= 3 || filters.ensino || filters.serie || filters.classe || filters.turno || filters.nee;
  }, [debouncedNome, filters]);

  const filteredAndSortedStudents = useMemo(() => {
    if (!allStudents || !hasActiveFilters) {
      return [];
    }

    let filtered = [...allStudents];

    // Client-side filtering
    const nameSearch = debouncedNome.trim().toUpperCase();
    if (nameSearch && nameSearch.length >= 3) {
      filtered = filtered.filter(student =>
        student.nome && student.nome.toUpperCase().includes(nameSearch)
      );
    }
    if (filters.ensino) {
      filtered = filtered.filter(s => s.ensino === filters.ensino);
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
  }, [allStudents, debouncedNome, filters, sortConfig, hasActiveFilters]);

  const uniqueFilterOptions = useMemo(() => {
    const getUniqueValues = (key: string, data: any[]) => 
      [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    return {
        ensinos: getUniqueValues('ensino', allStudents || []),
        series: getUniqueValues('serie', allStudents || []),
        classes: getUniqueValues('classe', allStudents || []),
        turnos: getUniqueValues('turno', allStudents || []),
    };
  }, [allStudents]);

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
            placeholder="Buscar por nome (mín. 3 caracteres)..."
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
        {allStudents && hasActiveFilters && (
          <p>
            {filteredAndSortedStudents.length > 0
              ? `${filteredAndSortedStudents.length} de ${allStudents.length} alunos encontrados.`
              : (debouncedNome.trim().length > 0 && debouncedNome.trim().length < 3)
                ? 'Digite pelo menos 3 caracteres para buscar por nome.'
                : 'Nenhum aluno encontrado com os critérios fornecidos.'
            }
          </p>
        )}
      </div>

      {hasActiveFilters ? (
        <StudentTable
            students={filteredAndSortedStudents}
            isLoading={!allStudents}
            onRowClick={handleStudentSelect}
            onReportCardClick={handleOpenReportCard}
            onSort={handleSort}
            sortConfig={sortConfig}
        />
      ) : (
         <Card>
            <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium text-foreground">Inicie uma Busca</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Utilize a busca por nome ou os filtros avançados para encontrar os alunos.
                </p>
            </CardContent>
        </Card>
      )}
      
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
