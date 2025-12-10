'use client';

import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Loader2, Trophy, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

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

    const rankedStudents = useMemo(() => {
        if (!allStudents) return [];
        
        const studentsWithAverages: StudentWithAverage[] = allStudents.map(student => {
            let average: number | null = null;
            if (student.boletim) {
                const averages = Object.values(student.boletim)
                    .map((disciplina: any) => disciplina.mediaFinal)
                    .filter((media): media is number => media !== null && media !== undefined && !isNaN(media));
                
                // Calcula a média dividindo por 9, como solicitado.
                if (averages.length > 0) {
                    average = averages.reduce((a, b) => a + b, 0) / 9;
                }
            }
            return { 
                id: student.id,
                nome: student.nome,
                serie: student.serie,
                classe: student.classe,
                turno: student.turno,
                average 
            };
        }).filter(s => s.average !== null);

        // Classifica os alunos pela média em ordem decrescente
        return studentsWithAverages.sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

    }, [allStudents]);

    const exportToPDF = () => {
        if (rankedStudents.length === 0) {
            toast({ variant: 'destructive', title: 'Nenhum dado para exportar.' });
            return;
        }

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const title = "Ranking Geral de Alunos";
        
        const body = rankedStudents.map((student, index) => [
            index + 1,
            student.nome,
            `${student.serie || ''} ${student.classe || ''} - ${student.turno || ''}`,
            student.average?.toFixed(3).replace('.', ',') ?? 'N/A'
        ]);

        autoTable(doc, {
            head: [['#', 'Nome do Aluno', 'Turma', 'Média Final']],
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

        doc.save(`Ranking_Geral_Alunos_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ranking Geral de Alunos</CardTitle>
                    <CardDescription>Classificação de todos os alunos da escola com base na média final calculada.</CardDescription>
                </CardHeader>
            </Card>

            {isLoading ? (
                 <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : rankedStudents.length > 0 ? (
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Resultado do Ranking</CardTitle>
                                <CardDescription>{rankedStudents.length} aluno(s) classificado(s).</CardDescription>
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
                                    <TableHead className="w-32 text-right">Média Final</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rankedStudents.map((student, index) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="text-center font-bold text-lg">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{student.nome}</TableCell>
                                        <TableCell className='hidden sm:table-cell'>{`${student.serie || ''} ${student.classe || ''} - ${student.turno || ''}`}</TableCell>
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
                            Não foram encontrados alunos com notas válidas para gerar o ranking.
                        </p>
                    </CardContent>
                </Card>
            )}

        </div>
    );
}
