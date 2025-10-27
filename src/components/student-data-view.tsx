"use client";

import { useState, useEffect, useCallback } from 'react';
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
    if (!firestore) return;

    const nameSearch = debouncedNome.trim();
    const hasNameSearch = nameSearch.length >= 3;
    const hasOtherFilters = filters.serie || filters.classe || filters.turno;

    // Condição para não pesquisar: Nenhum filtro ativo, ou busca por nome com menos de 3 caracteres e sem outros filtros
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

      // Condição de busca por nome (com 3+ caracteres)
      if (hasNameSearch) {
        conditions.push(where('nome', '>=', nameSearch.toUpperCase()));
        conditions.push(where('nome', '<=', nameSearch.toUpperCase() + '\uf8ff'));
      }

      // Condições para os outros filtros
      if (filters.serie) {
        conditions.push(where('serie', '==', filters.serie));
      }
      if (filters.classe) {
        conditions.push(where('classe', '==', filters.classe));
      }
      if (filters.turno) {
        conditions.push(where('turno', '==', filters.turno));
      }

      // Monta a query final. A ordenação deve ser consistente com o primeiro filtro de desigualdade.
      const finalQuery = query(
        baseQuery,
        ...conditions,
        orderBy('nome') // Ordena sempre por nome
      );

      const querySnapshot = await getDocs(finalQuery);
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentsData);

    } catch (error: any) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao buscar dados",
        description: error.message.includes("indexes") 
          ? "A base de dados precisa de um índice para esta consulta. Verifique a consola do Firebase."
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
              placeholder="Digite 3+ letras do nome..."
              value={filters.nome}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
            />
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
