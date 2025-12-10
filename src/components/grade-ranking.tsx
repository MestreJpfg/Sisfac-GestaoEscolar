'use client';

import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Trophy, Download, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface StudentWithAverage {
    id: string;
    nome: string;
    serie: string;
    classe: string;
    turno: string;
    average: number | null;
}

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
    
    // NEW APPROACH: Calculate filter options independently.
    const uniqueFilterOptions = useMemo(() => {
        const getUniqueValues = (data: any[], key: string) => 
            [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

        const ensinos = getUniqueValues(allStudents, 'ensino');
        
        const seriesData = filters.ensino ? allStudents.filter(s => s.ensino === filters.ensino) : [];
        const series = getUniqueValues(seriesData, 'serie');

        const classesData = filters.serie ? allStudents.filter(s => s.ensino === filters.ensino && s.serie === filters.serie) : [];
        const classes = getUniqueValues(classesData, 'classe');

        const turnosData = filters.classe ? allStudents.filter(s => s.ensino === filters.ensino && s.serie === filters.serie && s.classe === filters.classe) : [];
        const turnos = getUniqueValues(turnosData, 'turno');
        
        return { ensinos, series, classes, turnos };
    }, [allStudents, filters.ensino, filters.serie, filters.classe]);


    const isClassSelected = useMemo(() => {
        return filters.ensino && filters.serie && filters.classe && filters.turno;
    }, [filters]);

    const rankedStudents = useMemo(() => {
        if (!isClassSelected || allStudents.length === 0) return [];
        
        const studentsInClass = allStudents.filter(student => 
             student.ensino === filters.ensino &&
             student.serie === filters.serie &&
             student.classe === filters.classe &&
             student.turno === filters.turno
        );

        const studentsWithAverages = studentsInClass.map(student => {
            let totalMediaFinal = 0;
            let countDisciplinasComMedia = 0;
            
            if (student.boletim) {
                Object.values(student.boletim).forEach((disciplina: any) => {
                    if (disciplina && typeof disciplina.mediaFinal === 'number' && !isNaN(disciplina.mediaFinal)) {
                        totalMediaFinal += disciplina.mediaFinal;
                        countDisciplinasComMedia++;
                    }
                });
            }
            
            const average = countDisciplinasComMedia > 0 ? totalMediaFinal / 9 : null;

            return { 
                id: student.id,
                nome: student.nome,
                serie: student.serie,
                classe: student.classe,
                turno: student.turno,
                average 
            };
        });

        return studentsWithAverages
            .filter((s): s is StudentWithAverage => s.average !== null && s.average > 0)
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

    }, [allStudents, filters, isClassSelected]);
    
    const handleFilterChange = (name: string, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { newFilters.serie = ''; newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'serie') { newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'classe') { newFilters.turno = ''; }
            return newFilters;
        });
    };

    const exportToPDF = () => {
        if (rankedStudents.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum dado para exportar.' });
            return;
        }

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const title = `Ranking - ${filters.serie} ${filters.classe} - ${filters.turno}`;
        
        const chunk = (arr: any[], size: number) =>
            Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );

        const studentChunks = chunk(rankedStudents, 39);

        studentChunks.forEach((pageStudents, pageIndex) => {
            if (pageIndex > 0) {
                doc.addPage();
            }
            
            const body = pageStudents.map((student: StudentWithAverage, index: number) => [
                (pageIndex * 39) + index + 1,
                student.nome,
                student.average?.toFixed(3).replace('.', ',') ?? 'N/A'
            ]);

             autoTable(doc, {
                head: [['#', 'Nome do Aluno', 'Média Final']],
                body: body,
                didDrawPage: (data) => {
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.text(title, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
                },
                styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5 },
                headStyles: { fillColor: [30, 136, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                margin: { top: 20, right: 10, bottom: 10, left: 10 },
            });
        });

        doc.save(`Ranking_Turma_${filters.serie}_${filters.classe}.pdf`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ranking de Alunos por Turma</CardTitle>
                    <CardDescription>Selecione uma turma para ver a classificação dos alunos com base na média final.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Select value={filters.ensino} onValueChange={(v) => handleFilterChange('ensino', v)}>
                                <SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={(v) => handleFilterChange('serie', v)} disabled={!filters.ensino}>
                                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={(v) => handleFilterChange('classe', v)} disabled={!filters.serie}>
                                <SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(v) => handleFilterChange('turno', v)} disabled={!filters.classe}>
                                <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isClassSelected ? (
                isLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : rankedStudents.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Resultado do Ranking - {`${filters.serie} ${filters.classe}`}</CardTitle>
                                    <CardDescription>{rankedStudents.length} aluno(s) classificado(s) nesta turma.</CardDescription>
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
                                        <TableHead className="w-32 text-right">Média Final</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankedStudents.map((student, index) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="text-center font-bold text-lg">{index + 1}</TableCell>
                                            <TableCell className="font-medium">{student.nome}</TableCell>
                                            <TableCell className="text-right font-semibold text-primary">{student.average?.toFixed(3).replace('.', ',')}</TableCell>
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
                                Não foram encontrados alunos com notas válidas para esta turma.
                            </p>
                        </CardContent>
                    </Card>
                )
            ) : (
                 <Card>
                    <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium text-foreground">Selecione uma Turma</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Utilize os filtros acima para selecionar uma turma e gerar o ranking.
                        </p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
