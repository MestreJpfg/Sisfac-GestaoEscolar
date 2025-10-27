"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import StudentTable from './student-table';
import { Loader2, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import StudentDetailSheet from './student-detail-sheet';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';

const PAGE_SIZE = 20;

export default function StudentDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const [filters, setFilters] = useState({
    nome: '',
    serie: '',
    classe: '',
    turno: '',
  });

  const [filterOptions, setFilterOptions] = useState<{ series: string[], classes: string[], turnos: string[] }>({
    series: [],
    classes: [],
    turnos: [],
  });

  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, currentPage]);


  const fetchAllStudents = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const studentsCollectionRef = collection(firestore, 'alunos');
      const q = query(studentsCollectionRef, orderBy('nome'));
      const querySnapshot = await getDocs(q);
      const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setAllStudents(studentsData);
      setFilteredStudents(studentsData);

      // Extract unique values for filters, ensuring no empty strings
      const series = new Set<string>();
      const classes = new Set<string>();
      const turnos = new Set<string>();
      studentsData.forEach(student => {
        if (student.serie && String(student.serie).trim() !== '') series.add(String(student.serie));
        if (student.classe && String(student.classe).trim() !== '') classes.add(String(student.classe));
        if (student.turno && String(student.turno).trim() !== '') turnos.add(String(student.turno));
      });
      setFilterOptions({
        series: Array.from(series).sort(),
        classes: Array.from(classes).sort(),
        turnos: Array.from(turnos).sort(),
      });

    } catch (error: any) {
      console.error("Erro ao buscar alunos:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de alunos da base de dados.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    fetchAllStudents();
  }, [fetchAllStudents]);

  const applyFilters = useCallback(() => {
    let students = [...allStudents];
    
    const { nome, serie, classe, turno } = filters;

    if (nome) {
      students = students.filter(s => s.nome && s.nome.toLowerCase().includes(nome.toLowerCase()));
    }
    if (serie) {
      students = students.filter(s => s.serie === serie);
    }
    if (classe) {
      students = students.filter(s => s.classe === classe);
    }
    if (turno) {
      students = students.filter(s => s.turno === turno);
    }
    
    setFilteredStudents(students);
    setCurrentPage(1); // Reset to first page after filtering
    
  }, [allStudents, filters]);
  
  useEffect(() => {
    // Apply filters automatically when they change
    applyFilters();
  }, [filters, allStudents, applyFilters]);


  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      nome: '',
      serie: '',
      classe: '',
      turno: '',
    });
    setCurrentPage(1);
  }

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
  };

  const handleCloseSheet = () => {
    setSelectedStudent(null);
  };

  const handleStudentUpdate = () => {
    // Re-fetch all data to ensure table and filters are up-to-date
    fetchAllStudents();
    handleCloseSheet();
  };

  const hasActiveFilters = Object.values(filters).some(filter => filter !== '');
  
  if (isLoading && allStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">A carregar dados da base de dados...</p>
      </div>
    )
  }

  const paginationInfo = {
    totalResults: filteredStudents.length,
    startResult: Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredStudents.length),
    endResult: Math.min(currentPage * PAGE_SIZE, filteredStudents.length)
  };


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
              placeholder="Filtrar por nome..."
              value={filters.nome}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
            />
            <Select value={filters.serie || 'all'} onValueChange={(value) => handleFilterChange('serie', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por série..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as séries</SelectItem>
                {filterOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.classe || 'all'} onValueChange={(value) => handleFilterChange('classe', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por classe..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as classes</SelectItem>
                {filterOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.turno || 'all'} onValueChange={(value) => handleFilterChange('turno', value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por turno..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os turnos</SelectItem>
                {filterOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
        {filteredStudents.length > 0 && (
          <p>
            A mostrar {paginationInfo.startResult}–{paginationInfo.endResult} de {paginationInfo.totalResults} alunos encontrados.
            {hasActiveFilters && ` (${allStudents.length} no total)`}
          </p>
        )}
      </div>

      <StudentTable
        students={paginatedStudents}
        isLoading={isLoading}
        onRowClick={handleStudentSelect}
        currentPage={currentPage}
        totalPages={totalPages}
        onNextPage={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
        onPrevPage={() => setCurrentPage(p => Math.max(p - 1, 1))}
        hasFilters={hasActiveFilters}
        paginationInfo={paginationInfo}
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
