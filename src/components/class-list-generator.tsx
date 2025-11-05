"use client";

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { Printer, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from './ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import ClassListPrintView from './class-list-print-view';

export default function ClassListGenerator() {
  const firestore = useFirestore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [filters, setFilters] = useState({
    ensino: '',
    turno: '',
    classe: '',
  });

  const [uniqueOptions, setUniqueOptions] = useState<{ ensinos: string[], turnos: string[], classes: string[] }>({
    ensinos: [],
    turnos: [],
    classes: [],
  });

  // Fetch unique options for filters
  useEffect(() => {
    if (!firestore) return;

    const fetchUniqueOptions = async () => {
      const q = query(collection(firestore, 'alunos'));
      const querySnapshot = await getDocs(q);
      
      const ensinos = new Set<string>();
      const turnos = new Set<string>();
      const classes = new Set<string>();
      
      querySnapshot.docs.forEach(doc => {
        const student = doc.data();
        if (student.ensino) ensinos.add(String(student.ensino));
        if (student.turno) turnos.add(String(student.turno));
        if (student.classe) classes.add(String(student.classe));
      });

      setUniqueOptions({
        ensinos: Array.from(ensinos).sort(),
        turnos: Array.from(turnos).sort(),
        classes: Array.from(classes).sort(),
      });
    };

    fetchUniqueOptions();
  }, [firestore]);

  const handleFilterChange = (name: string, value: string) => {
    const newValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [name]: newValue }));
  };

  const handleGenerateList = async () => {
    if (!firestore) return;

    setIsLoading(true);
    setStudents([]);

    try {
      const baseQuery = collection(firestore, 'alunos');
      let conditions = [];
      
      if (filters.ensino) {
        conditions.push(where('ensino', '==', filters.ensino));
      }
      if (filters.turno) {
        conditions.push(where('turno', '==', filters.turno));
      }
      if (filters.classe) {
        conditions.push(where('classe', '==', filters.classe));
      }
      
      const finalQuery = conditions.length > 0 ? query(baseQuery, ...conditions) : query(baseQuery);
      const querySnapshot = await getDocs(finalQuery);
      
      let studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sort by name
      studentsData.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      setStudents(studentsData);
    } catch (error) {
      console.error("Erro ao gerar lista de turmas:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
        window.print();
        setIsPrinting(false);
    }, 500);
  };

  const clearFiltersAndResults = () => {
    setFilters({ ensino: '', turno: '', classe: '' });
    setStudents([]);
  };

  const isAnyFilterSelected = filters.ensino || filters.turno || filters.classe;

  return (
    <>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 non-printable">
                                <Printer className="h-8 w-8" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="flex flex-col">
                            <SheetHeader>
                                <SheetTitle>Gerar Lista de Turma</SheetTitle>
                                <SheetDescription>
                                    Selecione os filtros para gerar uma lista de alunos para impressão.
                                </SheetDescription>
                            </SheetHeader>
                            
                            <div className="space-y-4 py-4">
                                <Select value={filters.ensino} onValueChange={(value) => handleFilterChange('ensino', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Ensino..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Segmentos</SelectItem>
                                        {uniqueOptions.ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.turno} onValueChange={(value) => handleFilterChange('turno', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Turno..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Turnos</SelectItem>
                                        {uniqueOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.classe} onValueChange={(value) => handleFilterChange('classe', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Classe..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Classes</SelectItem>
                                        {uniqueOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Button onClick={handleGenerateList} disabled={!isAnyFilterSelected || isLoading} className="flex-1">
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Lista'}
                                </Button>
                                {isAnyFilterSelected && (
                                <Button variant="ghost" size="icon" onClick={clearFiltersAndResults}>
                                    <X className="h-4 w-4" />
                                </Button>
                                )}
                            </div>

                            <div className="mt-4 flex-1 overflow-y-auto border-t pt-4">
                                {students.length > 0 ? (
                                     <div className='flex flex-col h-full'>
                                        <h3 className="font-semibold text-center mb-2">{`Lista de Alunos - ${filters.ensino || ''} ${filters.classe || ''} - ${filters.turno || ''}`}</h3>
                                        <p className="text-sm text-muted-foreground text-center mb-4">{`${students.length} alunos encontrados`}</p>
                                        <div className="flex-1 overflow-y-auto">
                                            <ul className="divide-y">
                                                {students.map((student, index) => (
                                                <li key={student.id} className="py-2 text-sm flex items-center">
                                                    <span className="w-6 text-right mr-2 text-muted-foreground">{index + 1}.</span>
                                                    <span>{student.nome}</span>
                                                </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground pt-10">
                                        {isLoading ? 'A procurar...' : 'Nenhum aluno encontrado ou nenhum filtro aplicado.'}
                                    </div>
                                )}
                            </div>

                            <SheetFooter className="mt-auto pt-4 border-t">
                                <Button onClick={handlePrint} disabled={students.length === 0 || isPrinting} className="w-full">
                                    <Printer className="mr-2 h-4 w-4" />
                                    {isPrinting ? 'A preparar...' : 'Imprimir Lista'}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Criar Listas de Turmas</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <div className="printable-content">
            {isPrinting && <ClassListPrintView students={students} filters={filters} />}
        </div>
    </>
  );
}
