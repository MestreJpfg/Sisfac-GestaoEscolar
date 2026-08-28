
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Award, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { calculateAnnualAverage } from '@/lib/academic-utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RankedStudent {
  id: string;
  name: string;
  turma: string;
  average: number;
  serie: string;
  classe: string;
  turno: string;
}

const RankingTable = ({ title, students, isLoading, onExport }: { title: string, students: RankedStudent[], isLoading: boolean, onExport: () => void }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    Classificação dos alunos com base na média geral de todas as disciplinas.
                </CardDescription>
            </div>
            {!isLoading && students.length > 0 && (
                <Button variant="outline" size="sm" onClick={onExport} className="flex-shrink-0">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                </Button>
            )}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Pos.</TableHead>
                                <TableHead>Aluno</TableHead>
                                <TableHead className="hidden sm:table-cell">Turma</TableHead>
                                <TableHead className="text-right">Média Final</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student, index) => {
                                const rank = index + 1;
                                const medalColor =
                                    rank === 1 ? 'text-yellow-500' :
                                    rank === 2 ? 'text-gray-400' :
                                    rank === 3 ? 'text-yellow-700' : '';

                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="text-center font-bold">
                                           <div className="flex items-center justify-center gap-2">
                                              <span>{rank}º</span>
                                              {rank <= 3 && <Award className={cn("h-5 w-5", medalColor)} />}
                                           </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{student.turma}</TableCell>
                                        <TableCell className="text-right font-semibold">{student.average.toFixed(2)}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
             { !isLoading && students.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                    Nenhum aluno com notas válidas encontrado para a seleção atual.
                </div>
            )}
        </CardContent>
    </Card>
);

export default function StudentRankingView() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [filtersFund1, setFiltersFund1] = useState({ serie: 'all', classe: 'all', turno: 'all' });
    const [filtersFund2, setFiltersFund2] = useState({ serie: 'all', classe: 'all', turno: 'all' });
    
    const currentYear = useMemo(() => new Date().getFullYear().toString(), []);
    
    const seriesFund1 = useMemo(() => ["3º ANO", "4º ANO", "5º ANO"], []);
    const seriesFund2 = useMemo(() => ["6º ANO", "7º ANO", "8º ANO", "9º ANO"], []);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const q = query(collection(firestore, "alunos"));
                const querySnapshot = await getDocs(q);
                const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students for ranking:", error);
                toast({ variant: "destructive", title: "Erro ao carregar alunos" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);
    
    const { fundamental1, fundamental2 } = useMemo(() => {
        if (isLoading || allStudents.length === 0) {
            return { fundamental1: [], fundamental2: [] };
        }

        const fund1: RankedStudent[] = [];
        const fund2: RankedStudent[] = [];

        allStudents.forEach(student => {
            const studentSerie = student.serie?.toUpperCase();
            if (!studentSerie) return;

            const average = calculateAnnualAverage(student.boletim?.[currentYear]);
            if (average > 0) {
                const rankedStudent: RankedStudent = {
                    id: student.id,
                    name: student.nome,
                    turma: `${student.serie || ''} ${student.classe || ''}`.trim(),
                    average: average,
                    serie: student.serie || '',
                    classe: student.classe || '',
                    turno: student.turno || '',
                };
                
                if (seriesFund1.includes(studentSerie)) {
                    fund1.push(rankedStudent);
                } else if (seriesFund2.includes(studentSerie)) {
                    fund2.push(rankedStudent);
                }
            }
        });

        fund1.sort((a, b) => b.average - a.average);
        fund2.sort((a, b) => b.average - a.average);

        return { fundamental1: fund1, fundamental2: fund2 };
    }, [allStudents, isLoading, seriesFund1, seriesFund2, currentYear]);
    
    const getUniqueValues = (key: string, data: any[]) =>
        [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

    const filterOptionsFund1 = useMemo(() => {
        let students = fundamental1;
        if (filtersFund1.serie !== 'all') students = students.filter(s => s.serie === filtersFund1.serie);
        const classes = getUniqueValues('classe', students);
        if (filtersFund1.classe !== 'all') students = students.filter(s => s.classe === filtersFund1.classe);
        const turnos = getUniqueValues('turno', students);
        const series = getUniqueValues('serie', fundamental1);
        return { series, classes, turnos };
    }, [fundamental1, filtersFund1]);

    const filterOptionsFund2 = useMemo(() => {
        let students = fundamental2;
        if (filtersFund2.serie !== 'all') students = students.filter(s => s.serie === filtersFund2.serie);
        const classes = getUniqueValues('classe', students);
        if (filtersFund2.classe !== 'all') students = students.filter(s => s.classe === filtersFund2.classe);
        const turnos = getUniqueValues('turno', students);
        const series = getUniqueValues('serie', fundamental2);
        return { series, classes, turnos };
    }, [fundamental2, filtersFund2]);

    const handleExportPDF = (title: string, students: RankedStudent[], filterText: string) => {
        const doc = new jsPDF();
        const timestamp = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Ano Letivo: ${currentYear} | Filtros: ${filterText}`, 14, 28);
        doc.text(`Gerado em: ${timestamp}`, doc.internal.pageSize.getWidth() - 14, 28, { align: 'right' });

        const body = students.map((s, i) => [
            `${i + 1}º`,
            s.name,
            s.turma,
            s.average.toFixed(2).replace('.', ',')
        ]);

        autoTable(doc, {
            startY: 32,
            head: [['Pos.', 'Nome do Aluno', 'Turma', 'Média Final']],
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [30, 136, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 15 },
                1: { halign: 'left' },
                2: { halign: 'left' },
                3: { halign: 'right', cellWidth: 25 }
            }
        });

        doc.save(`Ranking_${title.replace(/\s+/g, '_')}_${currentYear}.pdf`);
    };

    const getFilterText = (f: { serie: string, classe: string, turno: string }) => {
        const parts = [];
        if (f.serie !== 'all') parts.push(`Série: ${f.serie}`);
        if (f.classe !== 'all') parts.push(`Turma: ${f.classe}`);
        if (f.turno !== 'all') parts.push(`Turno: ${f.turno}`);
        return parts.length > 0 ? parts.join(', ') : 'Todos';
    };

    const filteredFund1 = useMemo(() => 
        fundamental1.filter(s => 
            (filtersFund1.serie === 'all' || s.serie === filtersFund1.serie) && 
            (filtersFund1.classe === 'all' || s.classe === filtersFund1.classe) && 
            (filtersFund1.turno === 'all' || s.turno === filtersFund1.turno)
        ), [fundamental1, filtersFund1]);

    const filteredFund2 = useMemo(() => 
        fundamental2.filter(s => 
            (filtersFund2.serie === 'all' || s.serie === filtersFund2.serie) && 
            (filtersFund2.classe === 'all' || s.classe === filtersFund2.classe) && 
            (filtersFund2.turno === 'all' || s.turno === filtersFund2.turno)
        ), [fundamental2, filtersFund2]);

    return (
        <Tabs defaultValue="fund1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fund1">3º ao 5º Ano</TabsTrigger>
                <TabsTrigger value="fund2">6º ao 9º Ano</TabsTrigger>
            </TabsList>
            <TabsContent value="fund1" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Select value={filtersFund1.serie} onValueChange={v => setFiltersFund1({ serie: v, classe: 'all', turno: 'all' })}>
                        <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (3º ao 5º)</SelectItem>
                            {filterOptionsFund1.series.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund1.classe} onValueChange={v => setFiltersFund1(f => ({...f, classe: v, turno: 'all'}))} disabled={filtersFund1.serie === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Turma..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {filterOptionsFund1.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund1.turno} onValueChange={v => setFiltersFund1(f => ({...f, turno: v}))} disabled={filtersFund1.classe === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Turnos</SelectItem>
                             {filterOptionsFund1.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable 
                    title="Ranking Fundamental I" 
                    students={filteredFund1} 
                    isLoading={isLoading} 
                    onExport={() => handleExportPDF("Ranking Fundamental I", filteredFund1, getFilterText(filtersFund1))}
                />
            </TabsContent>
            <TabsContent value="fund2" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Select value={filtersFund2.serie} onValueChange={v => setFiltersFund2({ serie: v, classe: 'all', turno: 'all' })}>
                        <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (6º ao 9º)</SelectItem>
                            {filterOptionsFund2.series.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filtersFund2.classe} onValueChange={v => setFiltersFund2(f => ({...f, classe: v, turno: 'all'}))} disabled={filtersFund2.serie === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Turma..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {filterOptionsFund2.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund2.turno} onValueChange={v => setFiltersFund2(f => ({...f, turno: v}))} disabled={filtersFund2.classe === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Turnos</SelectItem>
                             {filterOptionsFund2.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable 
                    title="Ranking Fundamental II" 
                    students={filteredFund2} 
                    isLoading={isLoading} 
                    onExport={() => handleExportPDF("Ranking Fundamental II", filteredFund2, getFilterText(filtersFund2))}
                />
            </TabsContent>
        </Tabs>
    );
}
