'use client';

import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Loader2, Filter, X, Trophy, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface StudentWithAverage {
    id: string;
    nome: string;
    serie: string;
    classe: string;
    turno: string;
    ensino: string;
    average: number | null;
}

const chunk = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );

export default function GradeRanking() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [filters, setFilters] = useState({
        ensino: '',
        serie: '',
        classe: '',
        turno: '',
        discipline: '', // 'geral' or specific discipline
    });

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
                console.error("Error fetching students:", error);
                toast({ variant: "destructive", title: "Erro ao Carregar Alunos" });
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);

    const uniqueFilterOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [], disciplines: [] };

        const getUniqueValues = (key: string, data: any[]) =>
            [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

        const ensinos = getUniqueValues('ensino', allStudents);
        
        let seriesData = allStudents;
        if (filters.ensino) seriesData = allStudents.filter(s => s.ensino === filters.ensino);
        const series = getUniqueValues('serie', seriesData);
        
        let classesData = seriesData;
        if (filters.serie) classesData = seriesData.filter(s => s.serie === filters.serie);
        const classes = getUniqueValues('classe', classesData);
        
        let turnosData = classesData;
        if(filters.classe) turnosData = classesData.filter(s => s.classe === filters.classe);
        const turnos = getUniqueValues('turno', turnosData);

        const disciplines = [...new Set(allStudents.flatMap(s => s.boletim ? Object.keys(s.boletim) : []))]
            .map(d => d.replace(/_/g, ' ').replace(/-/g, '/'))
            .sort((a, b) => a.localeCompare(b));

        return { ensinos, series, classes, turnos, disciplines };
    }, [allStudents, filters.ensino, filters.serie, filters.classe]);


    const rankedStudents = useMemo(() => {
        let studentsToRank = allStudents;

        if (filters.ensino) studentsToRank = studentsToRank.filter(s => s.ensino === filters.ensino);
        if (filters.serie) studentsToRank = studentsToRank.filter(s => s.serie === filters.serie);
        if (filters.classe) studentsToRank = studentsToRank.filter(s => s.classe === filters.classe);
        if (filters.turno) studentsToRank = studentsToRank.filter(s => s.turno === filters.turno);

        const studentsWithAverages: StudentWithAverage[] = studentsToRank.map(student => {
            let average: number | null = null;
            if (student.boletim) {
                const disciplineId = filters.discipline && filters.discipline !== 'geral' 
                    ? filters.discipline.trim().replace(/\s+/g, '_').toLowerCase() 
                    : null;

                if (disciplineId) {
                    const disciplineData = student.boletim[disciplineId];
                    if (disciplineData && disciplineData.mediaFinal !== null && disciplineData.mediaFinal !== undefined) {
                        average = disciplineData.mediaFinal;
                    }
                } else { // Média Geral
                    const averages = Object.values(student.boletim)
                        .map((disciplina: any) => disciplina.mediaFinal)
                        .filter((media): media is number => media !== null && media !== undefined && !isNaN(media));
                    
                    if (averages.length > 0) {
                        average = averages.reduce((a, b) => a + b, 0) / averages.length;
                    }
                }
            }
            return { ...student, average };
        }).filter(s => s.average !== null);

        return studentsWithAverages.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

    }, [allStudents, filters]);

    const handleFilterChange = (name: string, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { newFilters.serie = ''; newFilters.classe = ''; newFilters.turno = '';}
            else if (name === 'serie') { newFilters.classe = ''; newFilters.turno = '';}
            else if (name === 'classe') { newFilters.turno = '';}
            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters({ ensino: '', serie: '', classe: '', turno: '', discipline: '' });
    };

    const exportToPDF = () => {
        if (rankedStudents.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum dado para exportar.' });
            return;
        }

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        const groupedStudents = rankedStudents.reduce((acc, student) => {
            const key = `${student.serie || 'Série Indefinida'}|${student.classe || 'Classe Indefinida'}|${student.turno || 'Turno Indefinido'}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(student);
            return acc;
        }, {} as { [key: string]: typeof rankedStudents });

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

                const body = pageStudents.map((student, index) => [
                    (i * 39) + index + 1,
                    student.nome,
                    student.average?.toFixed(2).replace('.', ',') ?? 'N/A'
                ]);

                const studentSample = pageStudents[0] || {};
                const filterTitle = filters.discipline && filters.discipline !== 'geral' 
                    ? `por ${filters.discipline}` 
                    : 'Geral';
                const title = `Ranking de Alunos ${filterTitle}`;
                const subtitle = `${studentSample.serie} ${studentSample.classe} - ${studentSample.turno}`;

                autoTable(doc, {
                    head: [['#', 'Nome do Aluno', 'Média Final']],
                    body: body,
                    didDrawPage: (data) => {
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
                        
                        doc.setFontSize(10);
                        doc.setFont('helvetica', 'normal');
                        doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
                    },
                    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5 },
                    headStyles: { fillColor: [30, 136, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                    margin: { top: 22, right: 10, bottom: 10, left: 10 },
                });
            }
            isFirstPage = false;
        }

        doc.save(`Ranking_Alunos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ranking de Alunos por Média</CardTitle>
                    <CardDescription>Filtre e classifique os alunos com base nas suas médias finais, de forma geral ou por disciplina.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                        <Filter className="h-5 w-5 text-primary" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                            <Select value={filters.ensino} onValueChange={(v) => handleFilterChange('ensino', v)} disabled={isLoading}>
                                <SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Segmentos</SelectItem>
                                    {uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={(v) => handleFilterChange('serie', v)} disabled={isLoading || !filters.ensino}>
                                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Séries</SelectItem>
                                    {uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <Select value={filters.classe} onValueChange={(v) => handleFilterChange('classe', v)} disabled={isLoading || !filters.serie}>
                                <SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as Classes</SelectItem>
                                    {uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(v) => handleFilterChange('turno', v)} disabled={isLoading || !filters.classe}>
                                <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Turnos</SelectItem>
                                    {uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filters.discipline} onValueChange={(v) => handleFilterChange('discipline', v)} disabled={isLoading}>
                                <SelectTrigger><SelectValue placeholder="Média..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="geral">Média Geral</SelectItem>
                                    {uniqueFilterOptions.disciplines.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {(filters.ensino || filters.serie || filters.classe || filters.turno || filters.discipline) && (
                            <Button variant="ghost" size="icon" onClick={clearFilters}>
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                 <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : rankedStudents.length > 0 ? (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Resultado do Ranking</CardTitle>
                                <CardDescription>{rankedStudents.length} aluno(s) encontrado(s).</CardDescription>
                            </div>
                            <Button onClick={exportToPDF}><Download className="mr-2 h-4 w-4" /> Exportar para PDF</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-16 text-center">Posição</TableHead>
                                    <TableHead>Nome do Aluno</TableHead>
                                    <TableHead className='hidden sm:table-cell'>Turma</TableHead>
                                    <TableHead className="w-24 text-right">Média Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rankedStudents.map((student, index) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="text-center font-bold text-lg">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{student.nome}</TableCell>
                                        <TableCell className='hidden sm:table-cell'>{`${student.serie} ${student.classe} - ${student.turno}`}</TableCell>
                                        <TableCell className="text-right font-semibold text-primary">{student.average?.toFixed(2).replace('.', ',')}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                        <Trophy className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum Aluno para Classificar</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Não foram encontrados alunos com notas válidas para os filtros selecionados.
                        </p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
