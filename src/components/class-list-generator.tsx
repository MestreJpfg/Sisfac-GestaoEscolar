

"use client";

import { useState, useMemo, useEffect } from 'react';
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ClipboardList, X, Loader2, Download, Filter, BookCheck, Columns, Grid3x3, Heading, Palette, TrendingUp, Award } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import ReportCardGrid from './report-card-grid';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';


// Helper function to chunk array
const chunk = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
  
const hexToRgb = (hex: string): { r: number, g: number, b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const getLightAlternateColor = (hex: string): [number, number, number] => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [245, 245, 245]; // Fallback to light gray

    // Blend with white to get a very light tint
    const r = Math.floor(rgb.r * 0.1 + 255 * 0.9);
    const g = Math.floor(rgb.g * 0.1 + 255 * 0.9);
    const b = Math.floor(rgb.b * 0.1 + 255 * 0.9);
    
    return [r, g, b];
};


export default function ClassListGenerator() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingGrid, setIsDownloadingGrid] = useState(false);
  const [isDownloadingCustom, setIsDownloadingCustom] = useState(false);
  const [isDownloadingSubjects, setIsDownloadingSubjects] = useState(false);
  const [isDownloadingAverages, setIsDownloadingAverages] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [activeAccordion, setActiveAccordion] = useState<string>("item-1");
  const [customColumnCount, setCustomColumnCount] = useState<string>('5');
  const [customTitle, setCustomTitle] = useState('');
  const [customHeaders, setCustomHeaders] = useState<string[]>([]);
  
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isLoadingAllStudents, setIsLoadingAllStudents] = useState(true);

  // Styling state
  const [headerColor, setHeaderColor] = useState('#e6e6e6');
  const [useAlternateRowColors, setUseAlternateRowColors] = useState(true);
  const [oneClassPerPage, setOneClassPerPage] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const availableYears = useMemo(() => {
    if (!allStudents) return [];
    const years = new Set<string>();
    allStudents.forEach(s => {
      if (s.boletim) {
        Object.keys(s.boletim).forEach(year => years.add(year));
      }
    });
    return Array.from(years).sort((a,b) => parseInt(b) - parseInt(a));
  }, [allStudents]);


  const [filters, setFilters] = useState({
    ensino: '',
    serie: '',
    turno: '',
    classe: '',
  });

  useEffect(() => {
    const fetchStudents = async () => {
      if (!firestore) return;
      setIsLoadingAllStudents(true);
      try {
        const q = query(collection(firestore, "alunos"));
        const querySnapshot = await getDocs(q);
        const studentsData = querySnapshot.docs.map(doc => doc.data());
        setAllStudents(studentsData);
      } catch (error) {
        console.error("Error fetching students: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar alunos",
          description: "Não foi possível buscar os dados dos alunos para os filtros.",
        });
      } finally {
        setIsLoadingAllStudents(false);
      }
    };
    fetchStudents();
  }, [firestore, toast]);
  
  useEffect(() => {
    const count = parseInt(customColumnCount, 10);
    if (isNaN(count)) return;
    setCustomHeaders(prev => {
        const newHeaders = new Array(count).fill('');
        for(let i=0; i < Math.min(prev.length, count); i++) {
            newHeaders[i] = prev[i];
        }
        return newHeaders;
    });
  }, [customColumnCount]);


  const uniqueOptions = useMemo(() => {
      if (!allStudents) return { ensinos: [], series: [], turnos: [], classes: [] };
      const getUniqueValues = (key: string, data: any[]) =>
        [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

      let filteredForOptions = allStudents;
      const ensinos = getUniqueValues('ensino', filteredForOptions);

      if (filters.ensino) {
        filteredForOptions = filteredForOptions.filter(s => s.ensino === filters.ensino);
      }
      const series = getUniqueValues('serie', filteredForOptions);

      if (filters.serie) {
        filteredForOptions = filteredForOptions.filter(s => s.serie === filters.serie);
      }
      const turnos = getUniqueValues('turno', filteredForOptions);
      
      if (filters.turno) {
        filteredForOptions = filteredForOptions.filter(s => s.turno === filters.turno);
      }
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
    if (!allStudents) {
        toast({
            variant: "destructive",
            title: "Dados não carregados",
            description: "Aguarde o carregamento dos dados dos alunos.",
        });
        return;
    }
    setIsGenerating(true);
    setStudents([]);
    
    await new Promise(resolve => setTimeout(resolve, 300));

    let studentsData = allStudents;

    if (filters.ensino) studentsData = studentsData.filter(s => s.ensino === filters.ensino);
    if (filters.serie) studentsData = studentsData.filter(s => s.serie === filters.serie);
    if (filters.turno) studentsData = studentsData.filter(s => s.turno === filters.turno);
    if (filters.classe) studentsData = studentsData.filter(s => s.classe === filters.classe);

    studentsData.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    setStudents(studentsData);

    if(studentsData.length > 0) {
      setActiveAccordion(""); 
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
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
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
            if (classStudents.length === 0) continue;

            const studentChunks = chunk(classStudents, 39);

            for (let i = 0; i < studentChunks.length; i++) {
                const pageStudents = studentChunks[i];
                if (i > 0 || !isFirstPage) {
                    doc.addPage();
                }
                
                const tableData = pageStudents.map((student, index) => {
                    return [
                        (i * 39) + index + 1,
                        student.nome,
                        student.data_nascimento || '',
                        '' // Coluna de observações vazia
                    ];
                });
                
                const studentSample = pageStudents[0] || {};
                const dynamicTitleParts = [
                    'Lista de Alunos',
                    studentSample.ensino,
                    studentSample.serie,
                    studentSample.classe,
                    studentSample.turno ? `- Turno: ${studentSample.turno}` : ''
                ];
                const dynamicTitle = dynamicTitleParts.filter(Boolean).join(' ');
                const finalTitle = customTitle.trim() ? `${customTitle.trim()} - ${dynamicTitle}` : dynamicTitle;
                
                autoTable(doc, {
                    head: [['Nº', 'Nome do Aluno', 'Data de Nasc.', 'Observações']],
                    body: tableData,
                    didDrawPage: (data) => {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
                        
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        doc.text(finalTitle, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

                        doc.setFontSize(7);
                        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 5);
                        const pageNumText = `Página ${doc.internal.getNumberOfPages()}`;
                        doc.text(pageNumText, doc.internal.pageSize.getWidth() - data.settings.margin.right, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
                    },
                    styles: {
                        font: 'helvetica',
                        fontSize: 8,
                        cellPadding: 1.5,
                    },
                    headStyles: {
                        fillColor: headerColor,
                        textColor: [40, 40, 40],
                        fontStyle: 'bold',
                    },
                    alternateRowStyles: {
                        fillColor: useAlternateRowColors ? getLightAlternateColor(headerColor) : false
                    },
                    margin: { top: 20, right: 10, bottom: 10, left: 10 },
                });
            }
            
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

  const calculateAverage = (boletimAno: any): number => {
    if (!boletimAno || !boletimAno.notas || typeof boletimAno.notas !== 'object') {
        return 0;
    }
  
    const disciplineKeys = Object.keys(boletimAno.notas);
    const allSubjectAverages: number[] = [];
  
    disciplineKeys.forEach(key => {
        const disciplina = boletimAno.notas[key];
        if (disciplina && typeof disciplina === 'object') {
            const etapaGrades = [disciplina.etapa1, disciplina.etapa2, disciplina.etapa3, disciplina.etapa4];
            const validGrades = etapaGrades.filter(g => g !== null && g !== undefined && !isNaN(g));
            
            if (validGrades.length > 0) {
                const subjectAverage = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
                allSubjectAverages.push(subjectAverage);
            }
        }
    });
  
    if (allSubjectAverages.length === 0) {
        return 0;
    }
  
    const overallSum = allSubjectAverages.reduce((acc, curr) => acc + curr, 0);
    return overallSum / allSubjectAverages.length;
  };

  const handleDownloadWithAverages = async () => {
    if (students.length === 0) return;
    setIsDownloadingAverages(true);

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const processStudentGroup = (studentList: any[], isFirstPage: boolean) => {
            const studentsWithAverages = studentList.map(student => ({
                ...student,
                average: calculateAverage(student.boletim?.[selectedYear])
            })).sort((a, b) => b.average - a.average);

            const studentChunks = chunk(studentsWithAverages, 39);

            for (let i = 0; i < studentChunks.length; i++) {
                const pageStudents = studentChunks[i];
                if (i > 0 || !isFirstPage) {
                    doc.addPage();
                }
                
                const tableData = pageStudents.map((student, index) => {
                    const globalIndex = (i * 39) + index;
                    return [
                        `${globalIndex + 1}º`,
                        student.nome,
                        student.average > 0 ? student.average.toFixed(2).replace('.', ',') : '-'
                    ];
                });
                
                const studentSample = pageStudents[0] || {};
                const dynamicTitleParts = [
                    `Lista de Alunos com Média Final (${selectedYear})`,
                    studentSample.ensino,
                    studentSample.serie,
                    studentSample.classe,
                    studentSample.turno ? `- Turno: ${studentSample.turno}` : ''
                ];
                const dynamicTitle = dynamicTitleParts.filter(Boolean).join(' ');
                const finalTitle = customTitle.trim() ? `${customTitle.trim()} - ${dynamicTitle}` : dynamicTitle;
                
                autoTable(doc, {
                    head: [['Pos.', 'Nome do Aluno', 'Média Final']],
                    body: tableData,
                    didDrawPage: (data) => {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        doc.text(finalTitle, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
                    },
                    styles: { fontSize: 8, cellPadding: 1.5, halign: 'center' },
                    headStyles: { fillColor: headerColor, textColor: [40, 40, 40], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: useAlternateRowColors ? getLightAlternateColor(headerColor) : false },
                    columnStyles: {
                        0: { cellWidth: 15, halign: 'center' },
                        1: { cellWidth: 'auto', halign: 'left' },
                        2: { cellWidth: 25, halign: 'center' },
                    },
                    margin: { top: 20, right: 10, bottom: 10, left: 10 },
                });

                if (i === 0) isFirstPage = false;
            }
            return isFirstPage;
        };

        if (oneClassPerPage) {
            const groupedStudents = students.reduce((acc, student) => {
                const key = `${student.ensino || 'S/E'}|${student.serie || 'S/S'}|${student.classe || 'S/C'}|${student.turno || 'S/T'}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(student);
                return acc;
            }, {} as { [key: string]: any[] });
            
            let isFirstGroup = true;
            for (const groupKey in groupedStudents) {
                if (!isFirstGroup) {
                    doc.addPage();
                }
                processStudentGroup(groupedStudents[groupKey], true);
                isFirstGroup = false;
            }

        } else {
            processStudentGroup(students, true);
        }

        const fileName = `Lista_com_Medias_${filters.serie || 'Geral'}.pdf`.replace(/ /g, '_');
        doc.save(fileName);

    } catch (error) {
        console.error("Error generating PDF with averages:", error);
        toast({ variant: "destructive", title: "Erro ao Gerar PDF", description: "Não foi possível criar o ficheiro com as médias." });
    } finally {
        setIsDownloadingAverages(false);
    }
  };


  const handleDownloadGrid = async () => {
    if (students.length === 0) return;
    setIsDownloadingGrid(true);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
        const studentChunks = chunk(students, 4);
        const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });

        for (let i = 0; i < studentChunks.length; i++) {
            const chunk = studentChunks[i];

            const elementToRender = document.createElement('div');
            container.appendChild(elementToRender);
            
            const reactRoot = await import('react-dom/client').then(m => m.createRoot(elementToRender));
            
            const studentsWithBoletimForYear = chunk.map(student => ({
                ...student,
                boletim: student.boletim?.[selectedYear]?.notas || {}
            }));

            await new Promise<void>(resolve => {
                reactRoot.render(<ReportCardGrid students={studentsWithBoletimForYear} />);
                setTimeout(resolve, 500); 
            });

            const canvas = await html2canvas(elementToRender, {
                scale: 2,
                useCORS: true,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

            reactRoot.unmount();
            container.removeChild(elementToRender);
        }
        
        const fileName = `Boletins_Grade_${filters.serie || 'Geral'}_${filters.classe || ''}.pdf`.replace(/ /g, '_');
        pdf.save(fileName);

    } catch (error) {
        console.error("Error generating grid PDF:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Gerar PDF em Grade",
            description: "Ocorreu um erro ao criar o ficheiro PDF.",
        });
    } finally {
        document.body.removeChild(container);
        setIsDownloadingGrid(false);
    }
  };

  const handleDownloadCustomColumns = async () => {
    if (students.length === 0) return;
    setIsDownloadingCustom(true);

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const numCols = parseInt(customColumnCount, 10);
        const head = [['Nº', 'Nome do Aluno', ...customHeaders]];
        
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
            if (classStudents.length === 0) continue;

            const studentChunks = chunk(classStudents, 39);

            for(let i=0; i < studentChunks.length; i++) {
                const pageStudents = studentChunks[i];

                if (i > 0 || !isFirstPage) {
                    doc.addPage();
                }

                const body = pageStudents.map((student, index) => [ (i * 39) + index + 1, student.nome, ...Array(numCols).fill('')]);
                const studentSample = pageStudents[0] || {};
                const dynamicTitleParts = [
                    'Lista de Alunos',
                    studentSample.ensino,
                    studentSample.serie,
                    studentSample.classe,
                    studentSample.turno ? `- Turno: ${studentSample.turno}` : ''
                ];
                const dynamicTitle = dynamicTitleParts.filter(Boolean).join(' ');
                const finalTitle = customTitle.trim() ? `${customTitle.trim()} - ${dynamicTitle}` : dynamicTitle;

                autoTable(doc, {
                    head: head,
                    body: body,
                    theme: 'grid',
                    didDrawPage: (data) => {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        doc.text(finalTitle, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
                    },
                    styles: { fontSize: 8, cellPadding: 1.5 },
                    headStyles: {
                        fillColor: headerColor,
                        textColor: [40, 40, 40],
                        fontStyle: 'bold',
                    },
                    alternateRowStyles: {
                        fillColor: useAlternateRowColors ? getLightAlternateColor(headerColor) : false
                    },
                    columnStyles: {
                        0: { cellWidth: 10 },
                        1: { cellWidth: 'auto' },
                    },
                    margin: { top: 20, right: 10, bottom: 10, left: 10 },
                });
            }
            isFirstPage = false;
        }

        doc.save(`Lista_Personalizada_${filters.serie || 'Geral'}.pdf`);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erro ao gerar PDF" });
    } finally {
      setIsDownloadingCustom(false);
    }
  };

  const handleDownloadSubjectGrid = async () => {
    if (students.length === 0) return;
    setIsDownloadingSubjects(true);

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const subjects = ['ART', 'CIE', 'ED.F', 'HIS', 'GEO', 'ING', 'MAT', 'PORT', 'REL'];
        const head = [['Nº', 'Nome do Aluno', ...subjects]];
        
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
            if (classStudents.length === 0) continue;

            const studentChunks = chunk(classStudents, 39);

            for(let i=0; i < studentChunks.length; i++) {
                const pageStudents = studentChunks[i];
                if (i > 0 || !isFirstPage) {
                    doc.addPage();
                }

                const body = pageStudents.map((student, index) => [(i * 39) + index + 1, student.nome, ...Array(subjects.length).fill('')]);
                const studentSample = pageStudents[0] || {};
                
                const dynamicTitleParts = [
                    'Grelha de Avaliação',
                    studentSample.ensino,
                    studentSample.serie,
                    studentSample.classe,
                    studentSample.turno ? `- Turno: ${studentSample.turno}` : ''
                ];
                const dynamicTitle = dynamicTitleParts.filter(Boolean).join(' ');
                const finalTitle = customTitle.trim() ? `${customTitle.trim()} - ${dynamicTitle}` : dynamicTitle;


                autoTable(doc, {
                    head: head,
                    body: body,
                    theme: 'grid',
                    didDrawPage: (data) => {
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'bold');
                        doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
                        doc.setFontSize(9);
                        doc.setFont('helvetica', 'normal');
                        doc.text(finalTitle, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
                    },
                    styles: { fontSize: 8, cellPadding: 1 },
                    headStyles: { 
                        fillColor: headerColor, 
                        textColor: [40, 40, 40],
                        fontStyle: 'bold',
                        halign: 'center',
                        valign: 'middle',
                    },
                    alternateRowStyles: {
                        fillColor: useAlternateRowColors ? getLightAlternateColor(headerColor) : false
                    },
                    columnStyles: {
                        0: { cellWidth: 10, halign: 'center' },
                        1: { cellWidth: 'auto' }, 
                        ...subjects.reduce((acc, _, index) => {
                            acc[index + 2] = { cellWidth: 12, halign: 'center' };
                            return acc;
                        }, {} as {[key: number]: {cellWidth: number, halign: 'center'}})
                    },
                    margin: { top: 20, right: 10, bottom: 10, left: 10 },
                });
            }
            isFirstPage = false;
        }

        doc.save(`Grelha_Disciplinas_${filters.serie || 'Geral'}.pdf`);
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: "Erro ao gerar PDF" });
    } finally {
      setIsDownloadingSubjects(false);
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
                            <Select value={filters.ensino} onValueChange={(value) => handleFilterChange('ensino', value)} disabled={isLoadingAllStudents}>
                                <SelectTrigger><SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por Ensino..."} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Segmentos</SelectItem>
                                    {uniqueOptions.ensinos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={(value) => handleFilterChange('serie', value)} disabled={isLoadingAllStudents || !filters.ensino}>
                                <SelectTrigger><SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por Série..."} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Séries</SelectItem>
                                    {uniqueOptions.series.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(value) => handleFilterChange('turno', value)} disabled={isLoadingAllStudents || !filters.serie}>
                                <SelectTrigger><SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por Turno..."} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Turnos</SelectItem>
                                    {uniqueOptions.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={(value) => handleFilterChange('classe', value)} disabled={isLoadingAllStudents || !filters.turno}>
                                <SelectTrigger><SelectValue placeholder={isLoadingAllStudents ? "A carregar..." : "Filtrar por Classe..."} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Classes</SelectItem>
                                    {uniqueOptions.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex items-center gap-2 pt-2">
                            <Button onClick={handleGenerateList} disabled={!isAnyFilterSelected || isGenerating || isLoadingAllStudents} className="flex-1">
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
                     <div className='flex flex-col h-full'>
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-center">{`Resultado da Filtragem`}</h3>
                            <p className="text-sm text-muted-foreground text-center">{`${students.length} alunos encontrados`}</p>
                        </div>
                        <div className="space-y-4 p-4">
                           <div className="space-y-2">
                                <Label htmlFor="custom-title">Título Personalizado (Opcional)</Label>
                                <Input 
                                    id="custom-title" 
                                    placeholder="Ex: Frequência de Prova, Lista de Atividades..."
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                />
                            </div>
                             <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="styling">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            <span>Estilo do PDF</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Label htmlFor="header-color">Cor do Cabeçalho</Label>
                                            <Input 
                                                id="header-color" 
                                                type="color" 
                                                value={headerColor}
                                                onChange={(e) => setHeaderColor(e.target.value)}
                                                className="w-14 h-10 p-1 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="alternate-rows" 
                                                checked={useAlternateRowColors}
                                                onCheckedChange={setUseAlternateRowColors}
                                            />
                                            <Label htmlFor="alternate-rows">Cores de linha alternadas</Label>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Switch 
                                                id="one-class-per-page" 
                                                checked={oneClassPerPage}
                                                onCheckedChange={setOneClassPerPage}
                                            />
                                            <Label htmlFor="one-class-per-page">Uma turma por página (apenas para lista com médias)</Label>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                        <ScrollArea className="flex-1" style={{ maxHeight: '500px' }}>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Nº</TableHead>
                                        <TableHead>Nome do Aluno</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student, index) => (
                                    <TableRow key={student.rm}>
                                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                        <TableCell>{student.nome}</TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                        <div className="p-4 border-t mt-auto grid grid-cols-1 md:grid-cols-2 gap-2">
                             <Accordion type="single" collapsible className="w-full md:col-span-2">
                                <AccordionItem value="exports">
                                    <AccordionTrigger>
                                        <div className="flex items-center gap-2">
                                            <Download className="h-4 w-4" />
                                            <span>Opções de Download</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-4 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <Button onClick={handleDownload} disabled={isDownloading} variant="secondary">
                                                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                                                Lista Simples
                                            </Button>
                                            <div className="space-y-2">
                                              <Select value={selectedYear} onValueChange={setSelectedYear} disabled={isLoadingAllStudents || availableYears.length === 0}>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Selecione o ano da média" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      {availableYears.map(y => <SelectItem key={y} value={y}>Usar médias de {y}</SelectItem>)}
                                                  </SelectContent>
                                              </Select>
                                              <Button onClick={handleDownloadWithAverages} disabled={isDownloadingAverages || !selectedYear} variant="secondary" className="w-full">
                                                  {isDownloadingAverages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                                                  Lista com Média Final
                                              </Button>
                                            </div>
                                            <Button onClick={handleDownloadGrid} disabled={isDownloadingGrid} variant="secondary">
                                                {isDownloadingGrid ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCheck className="mr-2 h-4 w-4" />}
                                                Boletins em Grade
                                            </Button>
                                        </div>
                                        
                                        <Accordion type="single" collapsible className="w-full">
                                            <AccordionItem value="custom-list">
                                                <AccordionTrigger>
                                                    <div className="flex items-center gap-2">
                                                        <Columns className="h-4 w-4" />
                                                        <span>Lista Personalizada</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-4 space-y-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="custom-cols">Quantidade de Colunas Vazias</Label>
                                                        <Select value={customColumnCount} onValueChange={setCustomColumnCount}>
                                                            <SelectTrigger id="custom-cols">
                                                                <SelectValue placeholder="Nº de colunas" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                                                    <SelectItem key={num} value={String(num)}>{num} {num > 1 ? 'Colunas' : 'Coluna'}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                     <div className="space-y-2">
                                                        <Label>Cabeçalhos das Colunas</Label>
                                                         <div className="grid grid-cols-2 gap-2">
                                                            {customHeaders.map((header, index) => (
                                                                <Input 
                                                                    key={index} 
                                                                    placeholder={`Coluna ${index + 1}`}
                                                                    value={header}
                                                                    onChange={(e) => {
                                                                        const newHeaders = [...customHeaders];
                                                                        newHeaders[index] = e.target.value;
                                                                        setCustomHeaders(newHeaders);
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                     </div>
                                                    <Button onClick={handleDownloadCustomColumns} disabled={isDownloadingCustom} className="w-full">
                                                        {isDownloadingCustom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                                        Gerar PDF Personalizado
                                                    </Button>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>

                                         <Card className="p-4 space-y-3">
                                            <Label>Grelha de Disciplinas</Label>
                                            <p className="text-xs text-muted-foreground">Gera uma lista com colunas para as principais disciplinas.</p>
                                            <Button onClick={handleDownloadSubjectGrid} disabled={isDownloadingSubjects} className="w-full">
                                                {isDownloadingSubjects ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Grid3x3 className="mr-2 h-4 w-4" />}
                                                Gerar Grelha de Disciplinas
                                            </Button>
                                        </Card>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
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
