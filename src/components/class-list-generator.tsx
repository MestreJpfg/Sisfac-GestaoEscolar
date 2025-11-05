"use client";

import { useState, useEffect, useMemo } from 'react';
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { ClipboardList, X, Loader2, Download, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from './ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Extend jsPDF with autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export default function ClassListGenerator() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [allStudentsData, setAllStudentsData] = useState<any[]>([]);
  
  const [filters, setFilters] = useState({
    ensino: '',
    serie: '',
    turno: '',
    classe: '',
  });

  useEffect(() => {
    if (!firestore || !isOpen) return;

    const fetchAllStudents = async () => {
      setIsLoading(true);
      if (allStudentsData.length === 0) {
        try {
            const q = query(collection(firestore, 'alunos'));
            const querySnapshot = await getDocs(q);
            const studentsData = querySnapshot.docs.map(doc => doc.data());
            setAllStudentsData(studentsData);
        } catch (error) {
            console.error("Erro ao buscar dados dos alunos:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: "Não foi possível buscar os dados dos alunos."
            });
        }
      }
      setIsLoading(false);
    };

    fetchAllStudents();
  }, [firestore, isOpen, allStudentsData.length, toast]);

  const uniqueOptions = useMemo(() => {
    const getUniqueValues = (key: string, data: any[]) => 
        Array.from(new Set(data.map(s => s[key]).filter(Boolean))).sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

    const getDynamicOptions = (key: string) => {
        let tempFilteredData = allStudentsData;
        if (filters.ensino) tempFilteredData = tempFilteredData.filter(s => s.ensino === filters.ensino);
        if (filters.serie && key !== 'serie') tempFilteredData = tempFilteredData.filter(s => s.serie === filters.serie);
        if (filters.turno && key !== 'turno') tempFilteredData = tempFilteredData.filter(s => s.turno === filters.turno);
        if (filters.classe && key !== 'classe') tempFilteredData = tempFilteredData.filter(s => s.classe === filters.classe);
        return getUniqueValues(key, tempFilteredData);
    };

    return {
      ensinos: getUniqueValues('ensino', allStudentsData),
      series: getDynamicOptions('serie'),
      turnos: getDynamicOptions('turno'),
      classes: getDynamicOptions('classe'),
    };
  }, [allStudentsData, filters]);

  const handleFilterChange = (name: string, value: string) => {
    const newValue = value === 'all' ? '' : value;
    setFilters(prev => {
        const newFilters = { ...prev, [name]: newValue };
        if (name === 'ensino') {
            newFilters.serie = '';
            newFilters.turno = '';
            newFilters.classe = '';
        } else if (name === 'serie') {
            newFilters.turno = '';
            newFilters.classe = '';
        } else if (name === 'turno') {
            newFilters.classe = '';
        }
        return newFilters;
    });
  };

  const handleGenerateList = async () => {
    setIsGeneratingList(true);
    setStudents([]);

    let studentsData = allStudentsData;

    if (filters.ensino) studentsData = studentsData.filter(s => s.ensino === filters.ensino);
    if (filters.serie) studentsData = studentsData.filter(s => s.serie === filters.serie);
    if (filters.turno) studentsData = studentsData.filter(s => s.turno === filters.turno);
    if (filters.classe) studentsData = studentsData.filter(s => s.classe === filters.classe);

    studentsData.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    setStudents(studentsData);

    setIsGeneratingList(false);
  };
  
  const handleDownload = async () => {
    if (students.length === 0) return;
    setIsProcessing(true);

    try {
      const doc = new jsPDF();
      const tableData = students.map((student, index) => [
        index + 1,
        student.nome,
        student.data_nascimento || '',
        student.rm || ''
      ]);

      const title = `Lista de Alunos - ${filters.ensino || ''} ${filters.serie || ''} ${filters.classe || ''} - Turno: ${filters.turno || ''}`.trim();
      const today = new Date();
      const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);

      const addHeaderAndFooter = (doc: jsPDF) => {
        const pageCount = doc.internal.pages.length - 1;
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          
          doc.setFontSize(14).setFont('helvetica', 'bold');
          doc.text('ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
          doc.setFontSize(9).setFont('helvetica', 'normal');
          doc.text('AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA | INEP: 23070188', doc.internal.pageSize.getWidth() / 2, 17, { align: 'center' });
          
          const footerText = `Gerado em: ${formattedDate} - Página ${i} de ${pageCount}`;
          doc.setFontSize(8);
          doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
        }
      };
      
      doc.autoTable({
        head: [['Nº', 'Nome do Aluno', 'Data de Nascimento', 'RM']],
        body: tableData,
        startY: 32,
        didDrawPage: (data) => {
          if (data.pageNumber === 1) {
            doc.setFontSize(16).setFont('helvetica', 'bold');
            doc.text("Lista de Alunos", doc.internal.pageSize.getWidth() / 2, 24, { align: 'center' });
            doc.setFontSize(11).setFont('helvetica', 'normal');
            doc.text(title, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });
          }
        },
        styles: {
          font: 'helvetica',
          fontSize: 9,
          cellPadding: 1.5,
        },
        headStyles: {
          fillColor: [230, 230, 230],
          textColor: [40, 40, 40],
          fontStyle: 'bold',
          fontSize: 10,
        },
        margin: { top: 32, bottom: 12 }
      });
      
      addHeaderAndFooter(doc);

      const fileName = `Lista_Turma_${filters.ensino || ''}_${filters.serie || ''}_${filters.classe || ''}.pdf`.replace(/ /g, '_');
      doc.save(fileName);

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Gerar PDF",
        description: "Ocorreu um erro ao criar o ficheiro PDF.",
      });
    } finally {
      setIsProcessing(false);
    }
  };


  const clearFiltersAndResults = () => {
    setFilters({ ensino: '', serie: '', turno: '', classe: '' });
    setStudents([]);
  };

  const isAnyFilterSelected = filters.ensino || filters.serie || filters.turno || filters.classe;

  return (
    <>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 non-printable">
                                <ClipboardList className="h-8 w-8" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent className="flex flex-col">
                            <SheetHeader>
                                <SheetTitle>Gerar Lista de Turma</SheetTitle>
                                <SheetDescription>
                                    Selecione os filtros para gerar uma lista de alunos para impressão.
                                </SheetDescription>
                            </SheetHeader>
                            
                             <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Filter className="h-4 w-4" />
                                            <span>Filtros de Seleção</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 py-4">
                                            { isLoading ? (
                                                <div className="flex items-center justify-center h-40">
                                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                </div>
                                            ) : (
                                            <>
                                                <Select value={filters.ensino} onValueChange={(value) => handleFilterChange('ensino', value)}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filtrar por Ensino..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todos os Segmentos</SelectItem>
                                                        {uniqueOptions.ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={filters.serie} onValueChange={(value) => handleFilterChange('serie', value)} disabled={!filters.ensino}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filtrar por Série..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas as Séries</SelectItem>
                                                        {uniqueOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={filters.turno} onValueChange={(value) => handleFilterChange('turno', value)} disabled={!filters.serie}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filtrar por Turno..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todos os Turnos</SelectItem>
                                                        {uniqueOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <Select value={filters.classe} onValueChange={(value) => handleFilterChange('classe', value)} disabled={!filters.turno}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Filtrar por Classe..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Todas as Classes</SelectItem>
                                                        {uniqueOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                            
                            <div className="flex items-center gap-2 pt-4">
                                <Button onClick={handleGenerateList} disabled={!isAnyFilterSelected || isGeneratingList || isLoading} className="flex-1">
                                    {isGeneratingList ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Lista'}
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
                                        <h3 className="font-semibold text-center mb-2">{`Lista de Alunos - ${filters.ensino || ''} ${filters.serie || ''} ${filters.classe || ''} - ${filters.turno || ''}`}</h3>
                                        <p className="text-sm text-muted-foreground text-center mb-4">{`${students.length} alunos encontrados`}</p>
                                        <div className="flex-1 overflow-y-auto">
                                            <ul className="divide-y">
                                                {students.map((student, index) => (
                                                <li key={student.id || student.rm} className="py-2 text-sm flex items-center">
                                                    <span className="w-6 text-right mr-2 text-muted-foreground">{index + 1}.</span>
                                                    <span>{student.nome}</span>
                                                </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground pt-10">
                                        {isGeneratingList ? 'A gerar...' : 'Nenhum aluno encontrado ou nenhum filtro aplicado.'}
                                    </div>
                                )}
                            </div>

                            <SheetFooter className="mt-auto pt-4 border-t">
                                <Button onClick={handleDownload} disabled={students.length === 0 || isProcessing} className="w-full">
                                    <Download className="mr-2 h-4 w-4" />
                                    {isProcessing ? 'A processar...' : 'Download da Lista'}
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
    </>
  );
}
