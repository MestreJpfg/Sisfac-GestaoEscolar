
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';

interface RankedStudent {
  id: string;
  name: string;
  turma: string;
  average: number;
  serie: string;
  classe: string;
  turno: string;
}

const calculateAverage = (boletim: any, year: string): number => {
    const boletimAno = boletim?.[year];
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

const RankingTable = ({ title, students, isLoading }: { title: string, students: RankedStudent[], isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
                Classificação dos alunos com base na média geral de todas as disciplinas.
            </CardDescription>
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
    
    const currentYear = new Date().getFullYear().toString();
    
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
                console.error("Error fetching students:", error);
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

            const average = calculateAverage(student.boletim, currentYear);
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
                
                if (seriesFund1.some(s => studentSerie.startsWith(s.replace('º ANO', '')))) {
                    fund1.push(rankedStudent);
                } else if (seriesFund2.some(s => studentSerie.startsWith(s.replace('º ANO', '')))) {
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
        if (filtersFund1.serie !== 'all') {
            students = students.filter(s => s.serie === filtersFund1.serie);
        }
        const classes = getUniqueValues('classe', students);

        if (filtersFund1.classe !== 'all') {
            students = students.filter(s => s.classe === filtersFund1.classe);
        }
        const turnos = getUniqueValues('turno', students);
        
        const series = getUniqueValues('serie', fundamental1);

        return { series, classes, turnos };
    }, [fundamental1, filtersFund1]);

    const filterOptionsFund2 = useMemo(() => {
        let students = fundamental2;
        if (filtersFund2.serie !== 'all') {
            students = students.filter(s => s.serie === filtersFund2.serie);
        }
        const classes = getUniqueValues('classe', students);

        if (filtersFund2.classe !== 'all') {
            students = students.filter(s => s.classe === filtersFund2.classe);
        }
        const turnos = getUniqueValues('turno', students);
        
        const series = getUniqueValues('serie', fundamental2);

        return { series, classes, turnos };
    }, [fundamental2, filtersFund2]);

    const filteredFund1 = useMemo(() => {
        return fundamental1.filter(s => 
            (filtersFund1.serie === 'all' || s.serie === filtersFund1.serie) &&
            (filtersFund1.classe === 'all' || s.classe === filtersFund1.classe) &&
            (filtersFund1.turno === 'all' || s.turno === filtersFund1.turno)
        );
    }, [fundamental1, filtersFund1]);

    const filteredFund2 = useMemo(() => {
        return fundamental2.filter(s => 
            (filtersFund2.serie === 'all' || s.serie === filtersFund2.serie) &&
            (filtersFund2.classe === 'all' || s.classe === filtersFund2.classe) &&
            (filtersFund2.turno === 'all' || s.turno === filtersFund2.turno)
        );
    }, [fundamental2, filtersFund2]);

    return (
        <Tabs defaultValue="fund1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fund1">3º ao 5º Ano</TabsTrigger>
                <TabsTrigger value="fund2">6º ao 9º Ano</TabsTrigger>
            </TabsList>
            <TabsContent value="fund1" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Select value={filtersFund1.serie} onValueChange={v => setFiltersFund1({ serie: v, classe: 'all', turno: 'all' })}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por série..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (3º ao 5º)</SelectItem>
                            {filterOptionsFund1.series.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund1.classe} onValueChange={v => setFiltersFund1(f => ({...f, classe: v, turno: 'all'}))} disabled={filtersFund1.serie === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por turma..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {filterOptionsFund1.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund1.turno} onValueChange={v => setFiltersFund1(f => ({...f, turno: v}))} disabled={filtersFund1.classe === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por turno..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Turnos</SelectItem>
                             {filterOptionsFund1.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable title="Ranking Fundamental I" students={filteredFund1} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="fund2" className="mt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Select value={filtersFund2.serie} onValueChange={v => setFiltersFund2({ serie: v, classe: 'all', turno: 'all' })}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por série..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (6º ao 9º)</SelectItem>
                            {filterOptionsFund2.series.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={filtersFund2.classe} onValueChange={v => setFiltersFund2(f => ({...f, classe: v, turno: 'all'}))} disabled={filtersFund2.serie === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por turma..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Turmas</SelectItem>
                            {filterOptionsFund2.classes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={filtersFund2.turno} onValueChange={v => setFiltersFund2(f => ({...f, turno: v}))} disabled={filtersFund2.classe === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por turno..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Turnos</SelectItem>
                             {filterOptionsFund2.turnos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable title="Ranking Fundamental II" students={filteredFund2} isLoading={isLoading} />
            </TabsContent>
        </Tabs>
    );
}
