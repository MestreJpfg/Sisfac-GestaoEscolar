
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

interface RankedStudent {
  id: string;
  name: string;
  turma: string;
  average: number;
  serie: string;
}

const calculateAverage = (boletim: any): number => {
    if (!boletim || typeof boletim !== 'object') {
        return 0;
    }

    const disciplineKeys = Object.keys(boletim);
    const subjectAverages: number[] = [];

    disciplineKeys.forEach(key => {
        const disciplina = boletim[key];
        if (disciplina && typeof disciplina === 'object') {
            const etapaGrades = [disciplina.etapa1, disciplina.etapa2, disciplina.etapa3, disciplina.etapa4];
            const validGrades = etapaGrades.map(g => {
                if (g === null || g === undefined || String(g).trim() === '') return null;
                const numericGrade = parseFloat(String(g).replace(',', '.'));
                return isNaN(numericGrade) ? null : numericGrade;
            }).filter((g): g is number => g !== null);

            if (validGrades.length > 0) {
                const subjectAverage = validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length;
                subjectAverages.push(subjectAverage);
            }
        }
    });

    if (subjectAverages.length === 0) {
        return 0;
    }

    const overallSum = subjectAverages.reduce((acc, curr) => acc + curr, 0);
    return overallSum / subjectAverages.length;
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
                            {students.map((student, index) => (
                                <TableRow key={student.id}>
                                    <TableCell className="text-center font-bold">
                                       <div className="flex items-center justify-center gap-2">
                                          {index < 3 ? (
                                             <Award 
                                                size={18} 
                                                className={
                                                   index === 0 ? 'text-yellow-500' : 
                                                   index === 1 ? 'text-gray-400' : 
                                                   'text-yellow-700'
                                                }
                                             />
                                          ) : <span className="w-[18px]"></span>}
                                          <span>{index + 1}º</span>
                                       </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{student.turma}</TableCell>
                                    <TableCell className="text-right font-semibold">{student.average.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
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

    const [filterFund1, setFilterFund1] = useState('all');
    const [filterFund2, setFilterFund2] = useState('all');

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

            const average = calculateAverage(student.boletim);
            if (average > 0) {
                const rankedStudent: RankedStudent = {
                    id: student.id,
                    name: student.nome,
                    turma: `${student.serie || ''} ${student.classe || ''}`.trim(),
                    average: average,
                    serie: studentSerie,
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
    }, [allStudents, isLoading, seriesFund1, seriesFund2]);

    const filteredFund1 = useMemo(() => {
        if (filterFund1 === 'all') return fundamental1;
        return fundamental1.filter(s => s.serie === filterFund1);
    }, [fundamental1, filterFund1]);

    const filteredFund2 = useMemo(() => {
        if (filterFund2 === 'all') return fundamental2;
        return fundamental2.filter(s => s.serie === filterFund2);
    }, [fundamental2, filterFund2]);

    return (
        <Tabs defaultValue="fund1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fund1">3º ao 5º Ano</TabsTrigger>
                <TabsTrigger value="fund2">6º ao 9º Ano</TabsTrigger>
            </TabsList>
            <TabsContent value="fund1" className="mt-6 space-y-4">
                <div className="w-full sm:w-64">
                    <Select value={filterFund1} onValueChange={setFilterFund1}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por série..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (3º ao 5º)</SelectItem>
                            {seriesFund1.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable title={`Ranking Fundamental I ${filterFund1 !== 'all' ? `(${filterFund1})` : ''}`} students={filteredFund1} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="fund2" className="mt-6 space-y-4">
                <div className="w-full sm:w-64">
                    <Select value={filterFund2} onValueChange={setFilterFund2}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar por série..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Séries (6º ao 9º)</SelectItem>
                            {seriesFund2.map(serie => <SelectItem key={serie} value={serie}>{serie}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <RankingTable title={`Ranking Fundamental II ${filterFund2 !== 'all' ? `(${filterFund2})` : ''}`} students={filteredFund2} isLoading={isLoading} />
            </TabsContent>
        </Tabs>
    );
}
