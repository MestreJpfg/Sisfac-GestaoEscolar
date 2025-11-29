
'use client';

import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Download } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { cn } from '@/lib/utils';

interface ReportFilters {
    ensino: string;
    serie: string;
    classe: string;
    turno: string;
}

interface MonthlyRecord {
    studentId: string;
    studentName: string;
    absences: { [day: number]: 'F' | 'J' }; // F for Ausente, J for Justificado
    total: number;
}

const years = Array.from({ length: 5 }, (_, i) => getYear(new Date()) - i);
const months = Array.from({ length: 12 }, (_, i) => ({
  value: i,
  label: format(new Date(0, i), 'MMMM', { locale: ptBR }),
}));


export default function MonthlyAttendanceReport() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Student data for filters
    const studentsOptionsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('profileId', '==', 'Aluno'));
    }, [firestore]);
    const { data: allStudents } = useCollection(studentsOptionsQuery);
    
    const [filters, setFilters] = useState<ReportFilters>({ ensino: '', serie: '', classe: '', turno: '' });
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));
    const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date()));
    const [reportData, setReportData] = useState<MonthlyRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const uniqueFilterOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [] };
        const getUniqueValues = (key: string, data: any[]) => [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

        let filteredForOptions = allStudents;
        const ensinos = getUniqueValues('ensino', filteredForOptions);
        if (filters.ensino) filteredForOptions = filteredForOptions.filter(s => s.ensino === filters.ensino);
        const series = getUniqueValues('serie', filteredForOptions);
        if (filters.serie) filteredForOptions = filteredForOptions.filter(s => s.serie === filters.serie);
        const classes = getUniqueValues('classe', filteredForOptions);
        if (filters.classe) filteredForOptions = filteredForOptions.filter(s => s.classe === filters.classe);
        const turnos = getUniqueValues('turno', filteredForOptions);
        
        return { ensinos, series, classes, turnos };
    }, [allStudents, filters]);

    const handleFilterChange = (name: keyof ReportFilters, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { newFilters.serie = ''; newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'serie') { newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'classe') { newFilters.turno = ''; }
            return newFilters;
        });
    };

    const daysInMonth = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth);
        return eachDayOfInterval({ start: startOfMonth(date), end: endOfMonth(date) });
    }, [selectedYear, selectedMonth]);

    const generateReport = async () => {
        if (!firestore || !allStudents) {
            toast({ variant: 'destructive', title: 'Dados não carregados', description: 'Aguarde o carregamento dos dados dos alunos.' });
            return;
        }
        if (!filters.ensino || !filters.serie || !filters.classe || !filters.turno) {
            toast({ variant: 'destructive', title: 'Filtros incompletos', description: 'Por favor, selecione todos os filtros da turma.' });
            return;
        }
        setIsLoading(true);
        setReportData([]);

        const studentsInClass = allStudents.filter(s => 
            (s.ensino === filters.ensino) &&
            (s.serie === filters.serie) &&
            (s.classe === filters.classe) &&
            (s.turno === filters.turno)
        ).sort((a, b) => a.name.localeCompare(b.name));

        if (studentsInClass.length === 0) {
            toast({ title: 'Nenhum aluno encontrado', description: 'Não há alunos que correspondam aos filtros selecionados.' });
            setIsLoading(false);
            return;
        }
        
        const studentIds = studentsInClass.map(s => s.id);
        const startDate = format(startOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
        const endDate = format(endOfMonth(new Date(selectedYear, selectedMonth)), 'yyyy-MM-dd');
        const attendanceByStudent: { [studentId: string]: { [date: string]: 'F' | 'J' } } = {};

        // Firestore 'in' query has a limit of 30 items. We need to chunk the requests.
        const chunkSize = 30;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const q = query(
                collection(firestore, 'attendance'),
                where('studentId', 'in', chunk),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            );
            const snapshot = await getDocs(q);
            snapshot.docs.forEach(doc => {
                const record = doc.data();
                if (!attendanceByStudent[record.studentId]) {
                    attendanceByStudent[record.studentId] = {};
                }
                attendanceByStudent[record.studentId][record.date] = record.status === 'Ausente' ? 'F' : 'J';
            });
        }

        const newReportData = studentsInClass.map(student => {
            const studentAbsences = attendanceByStudent[student.id] || {};
            const absences: { [day: number]: 'F' | 'J' } = {};
            let total = 0;
            
            daysInMonth.forEach(day => {
                const formattedDate = format(day, 'yyyy-MM-dd');
                const status = studentAbsences[formattedDate];
                if (status) {
                    absences[day.getDate()] = status;
                    if (status === 'F') total++; // Count only unexcused absences
                }
            });

            return {
                studentId: student.id,
                studentName: student.name,
                absences,
                total,
            };
        });
        
        setReportData(newReportData);
        setIsLoading(false);
        if (newReportData.every(r => Object.keys(r.absences).length === 0)) {
            toast({ title: 'Nenhuma falta registada', description: 'Não há faltas para esta seleção no mês selecionado.' });
        }
    };
    
    const exportMonthlyPDF = () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const title = `Relatório Mensal de Faltas - ${filters.serie || filters.ensino || ''} ${filters.classe || ''}`;
        const subtitle = `${format(new Date(selectedYear, selectedMonth), 'MMMM yyyy', { locale: ptBR })}`;

        doc.setFontSize(16);
        doc.text(title, 14, 15);
        doc.setFontSize(10);
        doc.text(subtitle, 14, 21);

        const head: (string | { content: string, styles: any })[] = [{ content: 'Aluno', styles: { halign: 'left' } }];
        daysInMonth.forEach(day => {
            const dayNumber = format(day, 'd');
            head.push({ content: dayNumber, styles: { halign: 'center', cellWidth: 6 } });
        });
        head.push({ content: 'Total', styles: { halign: 'center' } });

        const body = reportData.map(record => {
            const row: (string | { content: string, styles: any })[] = [{ content: record.studentName, styles: { halign: 'left', cellWidth: 'auto' } }];
            daysInMonth.forEach(day => {
                const status = record.absences[day.getDate()];
                row.push({ content: status || '', styles: { halign: 'center', textColor: status === 'F' ? [255,0,0] : (status === 'J' ? [245, 160, 0] : [0,0,0]) } });
            });
            row.push({ content: record.total > 0 ? String(record.total) : '', styles: { halign: 'center', fontStyle: 'bold' } });
            return row;
        });

        autoTable(doc, {
            head: [head],
            body: body,
            startY: 25,
            theme: 'grid',
            styles: { fontSize: 7, overflow: 'linebreak' },
            headStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40], fontSize: 8 },
            didParseCell: (data) => {
                if (data.section === 'head' && data.column.index > 0 && data.column.index <= daysInMonth.length) {
                    const day = daysInMonth[data.column.index - 1];
                    if (day.getDay() === 0 || day.getDay() === 6) { // Domingo ou Sábado
                        data.cell.styles.fillColor = '#fdecec';
                    }
                }
            }
        });

        doc.save(`Relatorio_Mensal_${filters.serie || 'geral'}_${filters.classe || ''}.pdf`);
    };

    return (
        <div className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md">
                <Select value={filters.ensino} onValueChange={(v) => handleFilterChange('ensino', v)}><SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger><SelectContent>{uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.serie} onValueChange={(v) => handleFilterChange('serie', v)} disabled={!filters.ensino}><SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger><SelectContent>{uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.classe} onValueChange={(v) => handleFilterChange('classe', v)} disabled={!filters.serie}><SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger><SelectContent>{uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                <Select value={filters.turno} onValueChange={(v) => handleFilterChange('turno', v)} disabled={!filters.classe}><SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger><SelectContent>{uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}><SelectTrigger><SelectValue placeholder="Mês..." /></SelectTrigger><SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent></Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}><SelectTrigger><SelectValue placeholder="Ano..." /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button onClick={generateReport} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                Gerar Relatório Mensal
            </Button>
            {reportData.length > 0 && (
                <div className="pt-4 space-y-2">
                    <Button onClick={exportMonthlyPDF} variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar PDF</Button>
                    <div className="overflow-x-auto border rounded-md">
                        <Table className="min-w-full">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="sticky left-0 bg-background z-10 w-48">Aluno</TableHead>
                                    {daysInMonth.map(day => {
                                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                        return <TableHead key={day.toISOString()} className={cn("text-center", isWeekend && "bg-muted/50")}>{format(day, 'd')}</TableHead>
                                    })}
                                    <TableHead className="text-center font-bold sticky right-0 bg-background z-10">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.map(record => (
                                    <TableRow key={record.studentId}>
                                        <TableCell className="font-medium sticky left-0 bg-background z-10 w-48 truncate">{record.studentName}</TableCell>
                                        {daysInMonth.map(day => {
                                             const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                             const status = record.absences[day.getDate()];
                                             return (
                                                <TableCell key={day.toISOString()} className={cn("text-center", isWeekend && "bg-muted/50")}>
                                                    <span className={cn(status === 'F' && 'text-red-500 font-bold', status === 'J' && 'text-yellow-500 font-bold')}>
                                                      {status || ''}
                                                    </span>
                                                </TableCell>
                                             )
                                        })}
                                        <TableCell className="text-center font-bold sticky right-0 bg-background z-10">{record.total > 0 ? record.total : ''}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}
