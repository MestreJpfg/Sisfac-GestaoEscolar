
"use client";

import { useState, useEffect, useMemo } from 'react';
import jsPDF from "jspdf";
import 'jspdf-autotable';
import html2canvas from "html2canvas";
import { ClipboardList, X, Loader2, Download, Filter, BookCopy, Phone } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from './ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReportCardGrid from './report-card-grid';
import { createRoot } from 'react-dom/client';


// Extend jsPDF with autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ClassListGeneratorProps {
  allStudents: any[];
}

export default function ClassListGenerator({ allStudents }: ClassListGeneratorProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingContacts, setIsProcessingContacts] = useState(false);
  
  const [filters, setFilters] = useState({
    ensino: '',
    serie: '',
    turno: '',
    classe: '',
  });

  const uniqueOptions = useMemo(() => {
    if (!allStudents) return { ensinos: [], series: [], turnos: [], classes: [] };
    
    const getUniqueValues = (key: string, data: any[]) => 
      [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    let filteredForOptions = allStudents;

    const ensinos = getUniqueValues('ensino', filteredForOptions);

    if(filters.ensino) filteredForOptions = filteredForOptions.filter(s => s.ensino === filters.ensino);
    const series = getUniqueValues('serie', filteredForOptions);

    if(filters.serie) filteredForOptions = filteredForOptions.filter(s => s.serie === filters.serie);
    const turnos = getUniqueValues('turno', filteredForOptions);

    if(filters.turno) filteredForOptions = filteredForOptions.filter(s => s.turno === filters.turno);
    const classes = getUniqueValues('classe', filteredForOptions);
    
    return { ensinos, series, turnos, classes };
}, [allStudents, filters]);


  const handleFilterChange = (name: string, value: string) => {
    const newValue = value === 'all' ? '' : value;
    setFilters(prev => {
        const newFilters = { ...prev, [name]: newValue };
        // Reset dependent filters when a parent filter changes
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

    let studentsData = allStudents;

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
        const today = new Date();
        const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);
  
        const addHeaderAndFooter = (doc: jsPDF, title: string, pageNumber: number, totalPages: number) => {
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            
            doc.setFontSize(8).setFont('helvetica', 'bold');
            doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', pageW / 2, 8, { align: 'center' });
            
            doc.setFontSize(9).setFont('helvetica', 'normal');
            doc.text(title, pageW / 2, 13, { align: 'center' });
  
            const footerText = `Gerado em: ${formattedDate}`;
            doc.setFontSize(7);
            doc.text(footerText, 10, pageH - 5);
            doc.text(`Página ${pageNumber} de ${totalPages}`, pageW - 10, pageH - 5, { align: 'right' });
        };
  
        const groupedStudents = students.reduce((acc, student) => {
            const key = `${student.ensino || 'N/A'}|${student.serie || 'N/A'}|${student.classe || 'N/A'}|${student.turno || 'N/A'}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(student);
            return acc;
        }, {} as Record<string, any[]>);
  
        const sortedGroupKeys = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

        let isFirstPageOfDoc = true;
  
        for (const key of sortedGroupKeys) {
            const group = groupedStudents[key];
            const [ensino, serie, classe, turno] = key.split('|');
            const tableData = group.map((student, index) => {
                return [
                    index + 1,
                    student.nome,
                    student.data_nascimento || '',
                    ''
                ]
            });
  
            if (!isFirstPageOfDoc) {
                doc.addPage();
            }
            isFirstPageOfDoc = false;
  
            const title = `Lista de Alunos - ${ensino} ${serie} ${classe} - Turno: ${turno}`.trim().replace(/N\/A/g, '').replace(/ +/g, ' ');
  
            doc.autoTable({
                head: [['Nº', 'Nome do Aluno', 'Data de Nasc.', 'Observações']],
                body: tableData,
                startY: 16,
                didDrawPage: (data) => {
                    addHeaderAndFooter(doc, title, data.pageNumber, (doc.internal as any).pages.length);
                },
                styles: {
                    font: 'helvetica',
                    fontSize: 7.5,
                    cellPadding: { top: 0.8, right: 1, bottom: 0.8, left: 1 },
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: [230, 230, 230],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                    fontSize: 8,
                },
                margin: { top: 16, bottom: 10, right: 10, left: 10 }
            });
        }
  
        const fileName = `Listas_de_Turmas_${filters.ensino || 'Geral'}.pdf`.replace(/ /g, '_');
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

  const handleDownloadContacts = async () => {
    if (students.length === 0) return;
    setIsProcessingContacts(true);

    try {
        const doc = new jsPDF();
        const today = new Date();
        const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);

         const addHeaderAndFooter = (doc: jsPDF, title: string, pageNumber: number, totalPages: number) => {
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            
            doc.setFontSize(8).setFont('helvetica', 'bold');
            doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', pageW / 2, 8, { align: 'center' });
            
            doc.setFontSize(9).setFont('helvetica', 'normal');
            doc.text(title, pageW / 2, 13, { align: 'center' });
  
            const footerText = `Gerado em: ${formattedDate}`;
            doc.setFontSize(7);
            doc.text(footerText, 10, pageH - 5);
            doc.text(`Página ${pageNumber} de ${totalPages}`, pageW - 10, pageH - 5, { align: 'right' });
        };
  
        const groupedStudents = students.reduce((acc, student) => {
            const key = `${student.ensino || 'N/A'}|${student.serie || 'N/A'}|${student.classe || 'N/A'}|${student.turno || 'N/A'}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(student);
            return acc;
        }, {} as Record<string, any[]>);
  
        const sortedGroupKeys = Object.keys(groupedStudents).sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

        let isFirstPageOfDoc = true;

        for (const key of sortedGroupKeys) {
            const group = groupedStudents[key];
            const [ensino, serie, classe, turno] = key.split('|');
            const tableData = group.map((student) => {
                const studentPhones = student.telefones || (student.telefone ? [student.telefone] : []);
                const phonesString = Array.isArray(studentPhones) ? studentPhones.join(', ') : '';
                return [student.nome, phonesString];
            });
  
            if (!isFirstPageOfDoc) {
                doc.addPage();
            }
            isFirstPageOfDoc = false;
  
            const title = `Lista de Contatos - ${ensino} ${serie} ${classe} - Turno: ${turno}`.trim().replace(/N\/A/g, '').replace(/ +/g, ' ');
  
            doc.autoTable({
                head: [['Nome do Aluno', 'Telefone']],
                body: tableData,
                startY: 16,
                didDrawPage: (data) => {
                    addHeaderAndFooter(doc, title, data.pageNumber, (doc.internal as any).pages.length);
                },
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: { top: 1, right: 1.5, bottom: 1, left: 1.5 },
                    valign: 'middle',
                },
                headStyles: {
                    fillColor: [230, 230, 230],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                    fontSize: 9,
                },
                margin: { top: 16, bottom: 10, right: 10, left: 10 }
            });
        }
  
        const fileName = `Lista_de_Contatos_${filters.ensino || 'Geral'}.pdf`.replace(/ /g, '_');
        doc.save(fileName);
  
    } catch (error) {
        console.error("Error generating contacts PDF:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Gerar PDF",
            description: "Ocorreu um erro ao criar o ficheiro de contatos PDF.",
        });
    } finally {
        setIsProcessingContacts(false);
    }
  };

  const handleDownloadAllReports = async () => {
    if (students.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum aluno na lista",
        description: "Gere uma lista de alunos antes de fazer o download dos boletins.",
      });
      return;
    }
  
    setIsGeneratingReports(true);
  
    try {
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      const studentChunks = [];
      for (let i = 0; i < students.length; i += 4) {
        studentChunks.push(students.slice(i, i + 4));
      }
  
      const renderContainer = document.createElement('div');
      renderContainer.style.position = 'absolute';
      renderContainer.style.left = '-9999px';
      document.body.appendChild(renderContainer);
      const root = createRoot(renderContainer);
  
      for (let i = 0; i < studentChunks.length; i++) {
        const chunk = studentChunks[i];
  
        // React 18: Render is async. No callback is needed.
        await new Promise<void>(resolve => {
            root.render(<ReportCardGrid students={chunk} />);
            setTimeout(resolve, 500); // Give it time to render
        });
        
        const canvas = await html2canvas(renderContainer, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }
      
      root.unmount();
      document.body.removeChild(renderContainer);
  
      const fileName = `Boletins_${filters.serie || 'Geral'}_${filters.classe || ''}.pdf`.replace(/ /g, '_');
      pdf.save(fileName);
  
    } catch (error) {
      console.error("Erro ao gerar os boletins em PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Gerar PDFs",
        description: "Ocorreu um erro ao criar o ficheiro com os boletins.",
      });
    } finally {
      setIsGeneratingReports(false);
    }
  };
  

  const clearFiltersAndResults = () => {
    setFilters({ ensino: '', serie: '', turno: '', classe: '' });
    setStudents([]);
  };

  const isAnyFilterSelected = filters.ensino || filters.serie || filters.turno || filters.classe;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
            <Button variant="secondary" className="flex items-center gap-2 shadow-lg">
                <ClipboardList className="h-4 w-4" />
                <span>Criar Listas</span>
            </Button>
        </SheetTrigger>
        <SheetContent className="w-full max-w-md sm:max-w-md flex flex-col">
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
                            { !allStudents ? (
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
                                <Select value={filters.serie} onValueChange={(value) => handleFilterChange('serie', value)} disabled={!filters.ensino && uniqueOptions.series.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Série..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Séries</SelectItem>
                                        {uniqueOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.turno} onValueChange={(value) => handleFilterChange('turno', value)} disabled={!filters.serie && uniqueOptions.turnos.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Turno..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os Turnos</SelectItem>
                                        {uniqueOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={filters.classe} onValueChange={(value) => handleFilterChange('classe', value)} disabled={!filters.turno && uniqueOptions.classes.length === 0}>
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
                <Button onClick={handleGenerateList} disabled={!isAnyFilterSelected || isGeneratingList || !allStudents} className="flex-1">
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
                        <h3 className="font-semibold text-center mb-2">{`Resultado da Filtragem`}</h3>
                        <p className="text-sm text-muted-foreground text-center mb-4">{`${students.length} alunos encontrados`}</p>
                        <div className="flex-1 overflow-y-auto">
                            <ul className="divide-y">
                                {students.map((student) => (
                                <li key={student.rm} className="py-2 text-sm flex items-center">
                                    <span className="w-6 text-right mr-2 text-muted-foreground">{students.indexOf(student) + 1}.</span>
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

            <SheetFooter className="mt-auto pt-4 border-t flex-col sm:flex-col sm:space-x-0 gap-2">
                <Button onClick={handleDownload} disabled={students.length === 0 || isProcessing} className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    {isProcessing ? 'A processar...' : 'Download da Lista'}
                </Button>
                 <Button onClick={handleDownloadContacts} disabled={students.length === 0 || isProcessingContacts} variant="secondary" className="w-full">
                    <Phone className="mr-2 h-4 w-4" />
                    {isProcessingContacts ? 'A processar...' : 'Exportar Contatos (PDF)'}
                </Button>
                 <Button onClick={handleDownloadAllReports} disabled={students.length === 0 || isGeneratingReports} className="w-full">
                    {isGeneratingReports ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCopy className="mr-2 h-4 w-4" />}
                    {isGeneratingReports ? 'A gerar boletins...' : 'Download Boletins'}
                </Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
  );
}

    