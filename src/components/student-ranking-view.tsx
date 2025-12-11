
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


interface RankedStudent {
  id: string;
  name: string;
  turma: string;
  average: number;
}

const calculateAverage = (boletim: any): number => {
    if (!boletim || typeof boletim !== 'object') {
      return 0;
    }

    const disciplineKeys = Object.keys(boletim);
    const allSubjectAverages: number[] = [];

    disciplineKeys.forEach(key => {
        const disciplina = boletim[key];
        if (disciplina && typeof disciplina === 'object') {
            
            // Calculate subject average from 'etapas'
            const etapaGrades = [disciplina.etapa1, disciplina.etapa2, disciplina.etapa3, disciplina.etapa4];
            const validEtapaGrades = etapaGrades.map(g => {
                if (g === null || g === undefined || String(g).trim() === '') return null;
                const numericGrade = parseFloat(String(g).replace(',', '.'));
                return isNaN(numericGrade) ? null : numericGrade;
            }).filter((g): g is number => g !== null);

            if (validEtapaGrades.length > 0) {
                const subjectAverage = validEtapaGrades.reduce((sum, grade) => sum + grade, 0) / validEtapaGrades.length;
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
                            {students.map((student, index) => (
                                <TableRow key={student.id}>
                                    <TableCell className="text-center font-bold">{index + 1}º</TableCell>
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
                    Nenhum aluno com notas válidas encontrado para este segmento.
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

        const seriesFund1 = ["3º ANO", "4º ANO", "5º ANO"];
        const seriesFund2 = ["6º ANO", "7º ANO", "8º ANO", "9º ANO"];

        const fundamental1: RankedStudent[] = [];
        const fundamental2: RankedStudent[] = [];

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
                };
                
                if (seriesFund1.includes(studentSerie)) {
                    fundamental1.push(rankedStudent);
                } else if (seriesFund2.includes(studentSerie)) {
                    fundamental2.push(rankedStudent);
                }
            }
        });

        fundamental1.sort((a, b) => b.average - a.average);
        fundamental2.sort((a, b) => b.average - a.average);

        return { fundamental1, fundamental2 };
    }, [allStudents, isLoading]);


    return (
        <Tabs defaultValue="fund1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fund1">3º ao 5º Ano</TabsTrigger>
                <TabsTrigger value="fund2">6º ao 9º Ano</TabsTrigger>
            </TabsList>
            <TabsContent value="fund1" className="mt-6">
                <RankingTable title="Ranking Fundamental I (3º ao 5º Ano)" students={fundamental1} isLoading={isLoading} />
            </TabsContent>
            <TabsContent value="fund2" className="mt-6">
                 <RankingTable title="Ranking Fundamental II (6º ao 9º Ano)" students={fundamental2} isLoading={isLoading} />
            </TabsContent>
        </Tabs>
    );
}
