
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, GitBranch, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MigrationToolProps {
    fromYear: number;
    toYear: number;
}

interface MigrationClass {
    id: string;
    fromSerie: string;
    toSerie: string;
    turma: string;
    turno: string;
    studentCount: number;
    studentIds: string[];
    status: 'pending' | 'migrating' | 'done' | 'error';
}

const getNextSerie = (currentSerie: string): string | null => {
    const match = currentSerie.match(/(\d+)/);
    if (!match) return null;
    const currentNumber = parseInt(match[0], 10);
    if (currentNumber >= 9) return null; // Não há migração para 9º ano
    return `${currentNumber + 1}º ANO`;
};

export default function MigrationTool({ fromYear, toYear }: MigrationToolProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [migrationClasses, setMigrationClasses] = useState<MigrationClass[]>([]);
    const [alertInfo, setAlertInfo] = useState<{ classId: string; studentCount: number } | null>(null);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const q = query(collection(firestore, 'alunos'), where('status', '==', 'ATIVO'));
                const snapshot = await getDocs(q);
                const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const classes = students.reduce((acc, student) => {
                    const { serie, classe, turno } = student;
                    if (!serie || !classe || !turno) return acc;
                    
                    const toSerie = getNextSerie(serie);
                    if (!toSerie) return acc;

                    const classKey = `${serie}-${classe}-${turno}`;
                    if (!acc[classKey]) {
                        acc[classKey] = {
                            id: classKey,
                            fromSerie: serie,
                            toSerie: toSerie,
                            turma: classe,
                            turno: turno,
                            studentCount: 0,
                            studentIds: [],
                            status: 'pending',
                        };
                    }
                    acc[classKey].studentCount++;
                    acc[classKey].studentIds.push(student.id);
                    return acc;
                }, {} as { [key: string]: MigrationClass });

                const sortedClasses = Object.values(classes).sort((a, b) => a.fromSerie.localeCompare(b.fromSerie) || a.turma.localeCompare(b.turma));
                setMigrationClasses(sortedClasses);

            } catch (error) {
                console.error("Error fetching students for migration:", error);
                toast({ variant: 'destructive', title: 'Erro ao carregar turmas.' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudents();
    }, [firestore, toast]);

    const handleMigrateClass = async (classId: string) => {
        if (!firestore) return;
        
        const targetClass = migrationClasses.find(c => c.id === classId);
        if (!targetClass) return;

        setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'migrating' } : c));

        try {
            const batch = writeBatch(firestore);
            targetClass.studentIds.forEach(studentId => {
                const studentRef = doc(firestore, 'alunos', studentId);
                batch.update(studentRef, { serie: targetClass.toSerie });
            });
            await batch.commit();
            setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'done' } : c));
            toast({
                title: 'Migração Concluída!',
                description: `${targetClass.studentCount} alunos da turma ${targetClass.fromSerie} ${targetClass.turma} foram migrados para ${targetClass.toSerie}.`
            });
        } catch (error) {
            console.error("Error migrating class:", error);
            setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'error' } : c));
            toast({ variant: 'destructive', title: 'Erro na migração.', description: 'Não foi possível migrar a turma.' });
        } finally {
            setAlertInfo(null);
        }
    };


    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">A carregar turmas para migração...</p>
            </div>
        );
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Migração de Ano Letivo: {fromYear} para {toYear}</CardTitle>
                    <CardDescription>
                        Esta ferramenta promove os alunos para a próxima série. Alunos do 9º ano não são migrados. 
                        A operação atualiza o campo 'serie' de cada aluno na turma selecionada. Esta ação não pode ser desfeita facilmente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Turma Atual</TableHead>
                                <TableHead>Nova Turma</TableHead>
                                <TableHead className="text-center">Nº de Alunos</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {migrationClasses.map((mc) => (
                                <TableRow key={mc.id}>
                                    <TableCell className="font-medium">{`${mc.fromSerie} ${mc.turma} (${mc.turno})`}</TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                        <span>{`${mc.toSerie} ${mc.turma} (${mc.turno})`}</span>
                                    </TableCell>
                                    <TableCell className="text-center">{mc.studentCount}</TableCell>
                                    <TableCell className="text-right">
                                        {mc.status === 'pending' && (
                                             <Button onClick={() => setAlertInfo({ classId: mc.id, studentCount: mc.studentCount })}>
                                                <GitBranch className="mr-2 h-4 w-4" />
                                                Migrar Turma
                                            </Button>
                                        )}
                                        {mc.status === 'migrating' && (
                                            <Button disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                A migrar...
                                            </Button>
                                        )}
                                        {mc.status === 'done' && (
                                            <div className="flex items-center justify-end gap-2 text-green-600">
                                                <CheckCircle className="h-5 w-5" />
                                                <span className="font-semibold">Concluído</span>
                                            </div>
                                        )}
                                         {mc.status === 'error' && (
                                            <div className="flex items-center justify-end gap-2 text-destructive">
                                                <XCircle className="h-5 w-5" />
                                                <span className="font-semibold">Erro</span>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                     {migrationClasses.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            Nenhuma turma ativa encontrada para migração.
                        </div>
                    )}
                </CardContent>
            </Card>

            {alertInfo && (
                <AlertDialog open={!!alertInfo} onOpenChange={() => setAlertInfo(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Migração de Turma?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja migrar <strong className='text-foreground'>{alertInfo.studentCount} alunos</strong>? A série deles será atualizada.
                                Esta ação é difícil de reverter.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleMigrateClass(alertInfo.classId)}>Sim, migrar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

    