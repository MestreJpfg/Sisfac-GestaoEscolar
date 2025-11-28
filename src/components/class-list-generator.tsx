
"use client";

import { useState, useMemo } from 'react';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import { ClipboardList, X, Loader2, Download, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClassListGeneratorProps {
  allStudents: any[];
}

export default function ClassListGenerator({ allStudents }: ClassListGeneratorProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [activeAccordion, setActiveAccordion] = useState<string>("item-1");
  
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
    setIsGenerating(true);
    setStudents([]);
    
    // Pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));

    let studentsData = allStudents;

    if (filters.ensino) studentsData = studentsData.filter(s => s.ensino === filters.ensino);
    if (filters.serie) studentsData = studentsData.filter(s => s.serie === filters.serie);
    if (filters.turno) studentsData = studentsData.filter(s => s.turno === filters.turno);
    if (filters.classe) studentsData = studentsData.filter(s => s.classe === filters.classe);

    studentsData.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    setStudents(studentsData);

    if(studentsData.length > 0) {
      setActiveAccordion(""); // Collapse accordion on successful generation
    } else {
      toast({
        variant: "destructive",
        title: "Nenhum Aluno Encontrado",
        description: "Não foram encontrados alunos com os filtros selecionados.",
      });
    }

    setIsGenerating(false);
  };
  
  const handleDownload = async () => {
    if (students.length === 0) return;
    setIsDownloading(true);

    try {
        const doc = new jsPDF();
        
        const groupedStudents = students.reduce((acc, student) => {
            const key = `${student.serie || 'Série Indefinida'}|${student.classe || 'Classe Indefinida'}|${student.turno || 'Turno Indefinido'}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(student);
            return acc;
        }, {} as { [key: string]: any[] });

        let isFirstPage = true;

        for (const groupKey in groupedStudents) {
            if (!isFirstPage) {
                doc.addPage();
            }

            const classStudents = groupedStudents[groupKey];
            const studentSample = classStudents[0] || {};
            
            const tableData = classStudents.map((student, index) => {
                return [
                    index + 1,
                    student.nome,
                    student.data_nascimento || '',
                    '' // Coluna de observações vazia
                ];
            });
            
            const titleParts = [
                'Lista de Alunos',
                studentSample.ensino,
                studentSample.serie,
                studentSample.classe,
                studentSample.turno ? `- Turno: ${studentSample.turno}` : ''
            ];
            const title = titleParts.filter(Boolean).join(' ');
            
            autoTable(doc, {
                head: [['Nº', 'Nome do Aluno', 'Data de Nasc.', 'Observações']],
                body: tableData,
                didDrawPage: (data) => {
                    // Header
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

                    // Footer
                    doc.setFontSize(7);
                    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 5);
                    const pageNum = doc.internal.getNumberOfPages();
                    doc.text(`Página ${pageNum}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
                },
                styles: {
                    font: 'helvetica',
                    fontSize: 8,
                    cellPadding: 1.5,
                },
                headStyles: {
                    fillColor: [230, 230, 230],
                    textColor: [40, 40, 40],
                    fontStyle: 'bold',
                },
                margin: { top: 25 },
            });
            
            isFirstPage = false;
        }

        const fileName = `Listas_Turmas_${filters.serie || 'Geral'}.pdf`.replace(/ /g, '_');
        doc.save(fileName);

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Gerar PDF",
            description: "Ocorreu um erro ao criar o ficheiro PDF.",
        });
    } finally {
        setIsDownloading(false);
    }
  };


  const clearFiltersAndResults = () => {
    setFilters({ ensino: '', serie: '', turno: '', classe: '' });
    setStudents([]);
    setActiveAccordion("item-1"); // Re-open accordion
  };

  const isAnyFilterSelected = filters.ensino || filters.serie || filters.turno || filters.classe;

  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle>Gerador de Listas de Turmas</CardTitle>
            <CardDescription>
                Selecione os filtros para gerar uma lista de alunos para impressão.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion} className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <span>Filtros de Seleção</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <Select value={filters.ensino} onValueChange={(value) => handleFilterChange('ensino', value)}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por Ensino..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Segmentos</SelectItem>
                                    {uniqueOptions.ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={(value) => handleFilterChange('serie', value)} disabled={!filters.ensino && uniqueOptions.series.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por Série..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Séries</SelectItem>
                                    {uniqueOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(value) => handleFilterChange('turno', value)} disabled={!filters.serie && uniqueOptions.turnos.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por Turno..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Turnos</SelectItem>
                                    {uniqueOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={(value) => handleFilterChange('classe', value)} disabled={!filters.turno && uniqueOptions.classes.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por Classe..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Classes</SelectItem>
                                    {uniqueOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-center gap-2 pt-2">
                            <Button onClick={handleGenerateList} disabled={!isAnyFilterSelected || isGenerating} className="flex-1">
                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Lista'}
                            </Button>
                            {isAnyFilterSelected && (
                            <Button variant="ghost" size="icon" onClick={clearFiltersAndResults}>
                                <X className="h-4 w-4" />
                            </Button>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            
            <div className="mt-4 border rounded-lg min-h-[200px] flex flex-col">
                {isGenerating ? (
                    <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground">
                       <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : students.length > 0 ? (
                     <div className='flex flex-col h-full max-h-96'>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-center">{`Resultado da Filtragem`}</h3>
                            <p className="text-sm text-muted-foreground text-center">{`${students.length} alunos encontrados`}</p>
                        </div>
                        <ScrollArea className="flex-1">
                            <ul className="divide-y p-4">
                                {students.map((student, index) => (
                                <li key={student.rm} className="py-2 text-sm flex items-center">
                                    <span className="w-8 text-right mr-2 text-muted-foreground">{index + 1}.</span>
                                    <span>{student.nome}</span>
                                </li>
                                ))}
                            </ul>
                        </ScrollArea>
                        <div className="p-4 border-t mt-auto">
                            <Button onClick={handleDownload} disabled={isDownloading} className="w-full">
                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isDownloading ? 'A gerar PDF...' : 'Download da Lista'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-sm text-muted-foreground p-4">
                        <p>Nenhum aluno encontrado ou nenhum filtro aplicado. Selecione os filtros acima e clique em "Gerar Lista".</p>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
  );
}
