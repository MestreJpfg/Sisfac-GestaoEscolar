
'use client';

import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, Loader2, Search, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import MonthlyAttendanceReport from './monthly-attendance-report';


interface ReportFilters {
    ensino: string;
    serie: string;
    classe: string;
    turno: string;
}

interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status: 'Ausente' | 'Justificado';
    studentName?: string;
    serie?: string;
    classe?: string;
    turno?: string;
}

export default function AttendanceReports() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoadingStudentsOptions, setIsLoadingStudentsOptions] = useState(true);
    
    // Daily Report State
    const [dailyFilters, setDailyFilters] = useState<ReportFilters>({ ensino: '', serie: '', classe: '', turno: '' });
    const [dailyDate, setDailyDate] = useState<Date | undefined>(new Date());
    const [dailyReportData, setDailyReportData] = useState<AttendanceRecord[]>([]);
    const [isLoadingDaily, setIsLoadingDaily] = useState(false);

    // Individual Report State
    const [individualSearch, setIndividualSearch] = useState('');
    const debouncedSearch = useDebounce(individualSearch, 500);
    const [searchedStudents, setSearchedStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [individualDateRange, setIndividualDateRange] = useState<DateRange | undefined>();
    const [individualReportData, setIndividualReportData] = useState<AttendanceRecord[]>([]);
    const [isLoadingIndividual, setIsLoadingIndividual] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingStudentsOptions(true);
            try {
                const q = query(collection(firestore, "alunos"));
                const querySnapshot = await getDocs(q);
                const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students for filters:", error);
                toast({ variant: "destructive", title: "Erro ao Carregar Alunos" });
            } finally {
                setIsLoadingStudentsOptions(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);


    const studentMap = useMemo(() => {
        if (!allStudents) return new Map();
        return new Map(allStudents.map(s => [s.id, s.nome]));
    }, [allStudents]);

    // Common filter logic
    const uniqueFilterOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [] };
        const getUniqueValues = (key: string, data: any[]) =>
          [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));
  
        let filteredForOptions = allStudents;
        const ensinos = getUniqueValues('ensino', filteredForOptions);
  
        if (dailyFilters.ensino) {
          filteredForOptions = filteredForOptions.filter(s => s.ensino === dailyFilters.ensino);
        }
        const series = getUniqueValues('serie', filteredForOptions);
  
        if (dailyFilters.serie) {
          filteredForOptions = filteredForOptions.filter(s => s.serie === dailyFilters.serie);
        }
        const classes = getUniqueValues('classe', filteredForOptions);
  
        // Turnos dependem apenas de ensino (se selecionado) para permitir seleção independente
        let filteredForTurnos = allStudents;
        if (dailyFilters.ensino) {
            filteredForTurnos = filteredForTurnos.filter(s => s.ensino === dailyFilters.ensino);
        }
        const turnos = getUniqueValues('turno', filteredForTurnos);
  
        return { ensinos, series, classes, turnos };
    }, [allStudents, dailyFilters]);

    const handleDailyFilterChange = (name: keyof ReportFilters, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setDailyFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { 
                newFilters.serie = ''; 
                newFilters.classe = ''; 
                newFilters.turno = ''; 
            } else if (name === 'serie') { 
                newFilters.classe = ''; 
                // Não reseta turno aqui para permitir independência
            } else if (name === 'classe') { 
                // Não reseta turno aqui para permitir independência
            }
            return newFilters;
        });
    };

    const generateDailyReport = async () => {
        if (!firestore || !dailyDate || !allStudents) {
            toast({ variant: 'destructive', title: 'Dados não carregados', description: 'Aguarde o carregamento dos dados dos alunos.' });
            return;
        }
        if (!dailyFilters.ensino && !dailyFilters.serie && !dailyFilters.classe && !dailyFilters.turno) {
            toast({ variant: 'destructive', title: 'Filtros incompletos', description: 'Por favor, selecione pelo menos um filtro.' });
            return;
        }

        setIsLoadingDaily(true);
        setDailyReportData([]);

        let studentsToQuery = allStudents.filter(s => {
            return (!dailyFilters.ensino || s.ensino === dailyFilters.ensino) &&
                   (!dailyFilters.serie || s.serie === dailyFilters.serie) &&
                   (!dailyFilters.classe || s.classe === dailyFilters.classe) &&
                   (!dailyFilters.turno || s.turno === dailyFilters.turno);
        });

        if (studentsToQuery.length === 0) {
            toast({ title: 'Nenhum aluno encontrado', description: 'Não há alunos que correspondam aos filtros selecionados.' });
            setIsLoadingDaily(false);
            return;
        }

        const studentIds = studentsToQuery.map(s => s.id);
        const formattedDate = format(dailyDate, 'yyyy-MM-dd');
        const records: AttendanceRecord[] = [];

        const chunkSize = 30;
        for (let i = 0; i < studentIds.length; i += chunkSize) {
            const chunk = studentIds.slice(i, i + chunkSize);
            const q = query(
                collection(firestore, 'attendance'),
                where('studentId', 'in', chunk),
                where('date', '==', formattedDate)
            );
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const data = doc.data() as AttendanceRecord;
                const student = allStudents.find(s => s.id === data.studentId);
                records.push({ 
                    ...data, 
                    studentName: student?.nome || 'Aluno não encontrado',
                    serie: student?.serie || '-',
                    classe: student?.classe || '-',
                    turno: student?.turno || '-'
                });
            });
        }
        
        records.sort((a, b) => a.studentName!.localeCompare(b.studentName!));

        setDailyReportData(records);
        setIsLoadingDaily(false);
        if (records.length === 0) {
            toast({ title: 'Nenhum registo encontrado', description: 'Não há faltas ou justificativas para esta seleção nesta data.' });
        }
    };

    const generateIndividualReport = async () => {
        if (!firestore || !selectedStudent || !individualDateRange?.from || !individualDateRange?.to) {
            toast({ variant: 'destructive', title: 'Filtros incompletos', description: 'Por favor, selecione um aluno e um intervalo de datas.' });
            return;
        }
        setIsLoadingIndividual(true);
        setIndividualReportData([]);

        const startDate = format(individualDateRange.from, 'yyyy-MM-dd');
        const endDate = format(individualDateRange.to, 'yyyy-MM-dd');

        const q = query(
            collection(firestore, 'attendance'),
            where('studentId', '==', selectedStudent.id),
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'asc')
        );

        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
        
        setIndividualReportData(records);
        setIsLoadingIndividual(false);
        if (records.length === 0) {
            toast({ title: 'Nenhum registo encontrado', description: 'Nenhuma falta registada para este aluno no período selecionado.' });
        }
    };

    useMemo(() => {
        if (debouncedSearch.length < 3) {
            setSearchedStudents([]);
            return;
        }
        const searchLower = debouncedSearch.toLowerCase();
        setSearchedStudents(
            allStudents?.filter(s => s.nome.toLowerCase().includes(searchLower)).slice(0, 5) || []
        );
    }, [debouncedSearch, allStudents]);

    const exportToPDF = (data: any[], title: string, head: string[][], body: any[][], subtitle?: string) => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(title, 14, 15);
        if (subtitle) {
            doc.setFontSize(10);
            doc.text(subtitle, 14, 21);
        }
        
        autoTable(doc, {
            head: head,
            body: body,
            startY: subtitle ? 25 : 20,
            theme: 'striped',
            headStyles: { fillColor: [30, 136, 229] },
            styles: { fontSize: 8 }
        });

        doc.save(`${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    };

    const renderDailyReport = () => (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Diário de Faltas</CardTitle>
                <CardDescription>Selecione os filtros e uma data para ver os alunos ausentes ou com falta justificada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Select value={dailyFilters.ensino} onValueChange={(v) => handleDailyFilterChange('ensino', v)} disabled={isLoadingStudentsOptions}><SelectTrigger><SelectValue placeholder={isLoadingStudentsOptions ? "A carregar..." : "Ensino..."} /></SelectTrigger><SelectContent>{uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                    <Select value={dailyFilters.serie} onValueChange={(v) => handleDailyFilterChange('serie', v)} disabled={isLoadingStudentsOptions || !dailyFilters.ensino}><SelectTrigger><SelectValue placeholder={isLoadingStudentsOptions ? "A carregar..." : "Série..."} /></SelectTrigger><SelectContent>{uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                    <Select value={dailyFilters.classe} onValueChange={(v) => handleDailyFilterChange('classe', v)} disabled={isLoadingStudentsOptions || !dailyFilters.serie}><SelectTrigger><SelectValue placeholder={isLoadingStudentsOptions ? "A carregar..." : "Classe..."} /></SelectTrigger><SelectContent>{uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                    <Select value={dailyFilters.turno} onValueChange={(v) => handleDailyFilterChange('turno', v)} disabled={isLoadingStudentsOptions}><SelectTrigger><SelectValue placeholder={isLoadingStudentsOptions ? "A carregar..." : "Turno..."} /></SelectTrigger><SelectContent>{uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                    <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("justify-start text-left font-normal", !dailyDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{dailyDate ? format(dailyDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dailyDate} onSelect={setDailyDate} initialFocus disabled={(date) => date > new Date()} /></PopoverContent></Popover>
                </div>
                <Button onClick={generateDailyReport} disabled={isLoadingDaily}>
                    {isLoadingDaily ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                    Gerar Relatório
                </Button>
                {dailyReportData.length > 0 && (
                    <div className="pt-4 space-y-2">
                        <Button onClick={() => exportToPDF(
                            dailyReportData, 
                            `Relatório de Faltas - ${format(dailyDate!, 'dd/MM/yyyy')}`, 
                            [['Aluno', 'Série', 'Turma', 'Turno', 'Status']], 
                            dailyReportData.map(r => [r.studentName, r.serie, r.classe, r.turno, r.status])
                        )} variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar PDF</Button>
                        <div className="overflow-x-auto border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Aluno</TableHead>
                                        <TableHead>Série</TableHead>
                                        <TableHead>Turma</TableHead>
                                        <TableHead>Turno</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dailyReportData.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-medium">{r.studentName}</TableCell>
                                            <TableCell>{r.serie}</TableCell>
                                            <TableCell>{r.classe}</TableCell>
                                            <TableCell>{r.turno}</TableCell>
                                            <TableCell>{r.status}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderMonthlyReport = () => (
         <Card>
            <CardHeader>
                <CardTitle>Relatório Mensal de Faltas</CardTitle>
                <CardDescription>Selecione uma turma, mês e ano para gerar um relatório consolidado de faltas.</CardDescription>
            </CardHeader>
            <CardContent>
                <MonthlyAttendanceReport />
            </CardContent>
        </Card>
    );

    const renderIndividualReport = () => (
        <Card>
            <CardHeader>
                <CardTitle>Relatório Individual de Faltas</CardTitle>
                <CardDescription>Pesquise por um aluno e selecione um período para ver o seu histórico de faltas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="relative">
                    <Input placeholder="Pesquisar aluno por nome..." value={individualSearch} onChange={e => {setIndividualSearch(e.target.value); setSelectedStudent(null);}} />
                    {individualSearch && searchedStudents.length > 0 && !selectedStudent && (
                        <Card className="absolute z-10 w-full mt-1">
                            <CardContent className="p-2">
                                {searchedStudents.map(s => (
                                    <div key={s.id} onClick={() => { setSelectedStudent(s); setIndividualSearch(s.nome); setSearchedStudents([]); }} className="p-2 hover:bg-muted rounded-md cursor-pointer">{s.nome}</div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="date" variant={"outline"} className={cn("w-full sm:w-[300px] justify-start text-left font-normal", !individualDateRange && "text-muted-foreground")} >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {individualDateRange?.from ? (individualDateRange.to ? (<>{format(individualDateRange.from, "PPP", { locale: ptBR })} - {format(individualDateRange.to, "PPP", { locale: ptBR })}</>) : (format(individualDateRange.from, "PPP", { locale: ptBR }))) : (<span>Escolha um período</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={individualDateRange?.from} selected={individualDateRange} onSelect={setIndividualDateRange} numberOfMonths={2}/></PopoverContent>
                </Popover>
                <Button onClick={generateIndividualReport} disabled={isLoadingIndividual || !selectedStudent}>
                     {isLoadingIndividual ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Search className="mr-2 h-4 w-4"/>}
                    Gerar Relatório Individual
                </Button>
                {individualReportData.length > 0 && (
                     <div className="pt-4 space-y-2">
                        <div className="p-4 bg-muted/50 rounded-lg mb-4">
                            <h3 className="font-bold text-lg">{selectedStudent.nome}</h3>
                            <p className="text-sm text-muted-foreground">{selectedStudent.serie} {selectedStudent.classe} - Turno: {selectedStudent.turno}</p>
                            <p className="text-sm font-semibold mt-2">Total de Faltas no Período: {individualReportData.length}</p>
                        </div>
                        <Button onClick={() => exportToPDF(
                            individualReportData, 
                            `Relatório de Faltas - ${selectedStudent.nome}`, 
                            [['Data', 'Status']], 
                            individualReportData.map(r => [format(new Date(r.date + 'T00:00:00-03:00'), 'dd/MM/yyyy', { locale: ptBR }), r.status]),
                            `Turma: ${selectedStudent.serie} ${selectedStudent.classe} | Turno: ${selectedStudent.turno}`
                        )} variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar PDF</Button>
                        <Table>
                            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>{individualReportData.map(r => <TableRow key={r.id}><TableCell>{format(new Date(r.date + 'T00:00:00-03:00'), 'dd/MM/yyyy', { locale: ptBR })}</TableCell><TableCell>{r.status}</TableCell></TableRow>)}</TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    if (isLoadingStudentsOptions) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <Tabs defaultValue="diario" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="diario">Diário</TabsTrigger>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
                <TabsTrigger value="individual">Individual</TabsTrigger>
            </TabsList>
            <TabsContent value="diario" className="mt-6">
                {renderDailyReport()}
            </TabsContent>
            <TabsContent value="mensal" className="mt-6">
                {renderMonthlyReport()}
            </TabsContent>
             <TabsContent value="individual" className="mt-6">
                {renderIndividualReport()}
            </TabsContent>
        </Tabs>
    );
}
