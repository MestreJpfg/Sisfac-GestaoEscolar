"use client";

import { useState, useEffect, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Filter, X, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [students, setStudents] = useState<any[]>([]);
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

  useEffect(() => {
    const fetchUniqueOptions = async () => {
      if (!firestore) return;
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
        console.error("Erro ao buscar opções de filtro:", error);
      }
    };
    fetchUniqueOptions();
  }, [firestore]);


  const searchStudents = useCallback(async () => {
    if (!firestore) return;

    const nameSearch = debouncedNome.trim().toUpperCase();
    const hasNameSearch = nameSearch.length >= 3;
    const hasOtherFilters = !!(filters.serie || filters.classe || filters.turno);

    if (!hasNameSearch && !hasOtherFilters) {
      setStudents([]);
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
      
      studentsData.sort((a, b) => {
        const nomeA = String(a.nome || '').toUpperCase();
        const nomeB = String(b.nome || '').toUpperCase();
        if (nomeA < nomeB) return -1;
        if (nomeA > nomeB) return 1;
        return 0;
      });

      setStudents(studentsData);

    } catch (error: any) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: error.message.includes("index") 
          ? "A base de dados precisa de um índice para esta consulta. Por favor, verifique a consola do Firebase."
          : "Não foi possível realizar a busca na base de dados.",
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
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
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
    searchStudents();
    handleCloseSheet();
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '' && filter !== filters.nome);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Filtrar Base de Dados</h3>
          </div>
          
          <Input
            name="nome"
            placeholder="Digite 3+ letras do nome para buscar..."
            value={filters.nome}
            onChange={(e) => handleFilterChange('nome', e.target.value)}
          />

          <Collapsible open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-0 text-sm font-semibold text-primary">
                 Filtros Avançados
                <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isAdvancedSearchOpen && "rotate-180")} />
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
              
              {(hasActiveFilters || (filters.nome.length > 0 && !hasSearched)) && (
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
