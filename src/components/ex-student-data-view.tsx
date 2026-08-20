
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, doc, deleteDoc } from 'firebase/firestore';
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
import StudentReportCardDialog from './student-report-card-dialog';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function ExStudentDataView() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [reportCardStudent, setReportCardStudent] = useState<any | null>(null);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    nome: '',
    ensino: '',
    serie: '',
    status: '', // Formado, Transferido, etc.
  });

  const debouncedNome = useDebounce(filters.nome, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nome', direction: 'ascending' });

  const [allExStudents, setAllExStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExStudents = async () => {
      if (!firestore) return;
      setIsLoading(true);
      try {
        const q = query(collection(firestore, 'exalunos'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllExStudents(data);
      } catch (error) {
        console.error("Error fetching ex-students:", error);
        toast({ variant: "destructive", title: "Erro ao carregar ex-alunos" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchExStudents();
  }, [firestore, toast]);

  const uniqueFilterOptions = useMemo(() => {
    if (!allExStudents) return { ensinos: [], series: [], statuses: [] };
    const getUnique = (key: string) => [...new Set(allExStudents.map(s => s[key]).filter(Boolean))].sort();
    return {
      ensinos: getUnique('ensino'),
      series: getUnique('serie'),
      statuses: getUnique('status'),
    };
  }, [allExStudents]);

  const filteredStudents = useMemo(() => {
    const searchLower = debouncedNome.trim().toLowerCase();
    return allExStudents.filter(s => {
      if (filters.ensino && s.ensino !== filters.ensino) return false;
      if (filters.serie && s.serie !== filters.serie) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (searchLower.length >= 3 && !s.nome?.toLowerCase().includes(searchLower)) return false;
      return true;
    }).sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      return sortConfig.direction === 'ascending' 
        ? String(aVal).localeCompare(String(bVal)) 
        : String(bVal).localeCompare(String(aVal));
    });
  }, [allExStudents, debouncedNome, filters, sortConfig]);

  const handleReactivate = async (student: any) => {
    if (!firestore) return;
    try {
      const studentId = String(student.id);
      const exRef = doc(firestore, 'exalunos', studentId);
      const activeRef = doc(firestore, 'alunos', studentId);
      
      const { status, ...cleanData } = student;
      
      setDocumentNonBlocking(activeRef, { ...cleanData, status: 'ATIVO', updatedAt: new Date().toISOString() });
      deleteDocumentNonBlocking(exRef);
      
      setAllExStudents(prev => prev.filter(s => s.id !== studentId));
      toast({ title: "Aluno Reativado", description: `${student.nome} voltou para a lista de alunos ativos.` });
      setSelectedStudent(null);
    } catch (e) {
      toast({ variant: 'destructive', title: "Erro ao reativar" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <Input
            placeholder="Buscar ex-aluno por nome..."
            value={filters.nome}
            onChange={(e) => setFilters({...filters, nome: e.target.value})}
          />
          <Collapsible open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-0 text-sm font-semibold text-primary">
                <Filter className="w-4 h-4 mr-2" /> Filtros de Histórico
                <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", isAdvancedSearchOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select value={filters.ensino} onValueChange={v => setFilters({...filters, ensino: v === 'all' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.serie} onValueChange={v => setFilters({...filters, serie: v === 'all' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v === 'all' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {uniqueFilterOptions.statuses.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>
      ) : (
        <StudentTable
          students={filteredStudents}
          onRowClick={setSelectedStudent}
          onReportCardClick={setReportCardStudent}
          onSort={setSortConfig as any}
          sortConfig={sortConfig}
          isLoading={false}
          isSearchActive={true}
        />
      )}

      {selectedStudent && (
        <StudentDetailSheet
          student={selectedStudent}
          allStudents={[]}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdate={() => {}} // No update needed for ex-students list as they are moved or edited via active
        />
      )}

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
