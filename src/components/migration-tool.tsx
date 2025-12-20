
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, writeBatch, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, GitBranch, ArrowRight, CheckCircle, XCircle, GraduationCap } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface MigrationToolProps {
    fromYear: number;
    toYear: number;
}

interface MigrationClass {
    id: string;
    fromSerie: string;
    toSerie: string | null; // Can be null for 9th graders
    turma: string;
    turno: string;
    studentCount: number;
    studentIds: string[];
    status: 'pending' | 'migrating' | 'graduating' | 'done' | 'error';
}

const getNextSerie = (currentSerie: string): string | null => {
    const match = currentSerie.match(/(\d+)/);
    if (!match) return null;
    const currentNumber = parseInt(match[0], 10);
    if (currentNumber >= 9) return null; // 9th graders graduate, they don't migrate to 10th
    return `${currentNumber + 1}º ANO`;
};

export default function MigrationTool({ fromYear, toYear }: MigrationToolProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [migrationClasses, setMigrationClasses] = useState<MigrationClass[]>([]);
    const [alertInfo, setAlertInfo] = useState<{ classId: string; studentCount: number; isGraduating: boolean } | null>(null);

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

                const sortedClasses = Object.values(classes).sort((a, b) => a.fromSerie.localeCompare(b.fromSerie, 'pt-BR', { numeric: true }) || a.turma.localeCompare(b.turma));
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

    const handleGraduateClass = async (classId: string) => {
        if (!firestore) return;

        const targetClass = migrationClasses.find(c => c.id === classId);
        if (!targetClass) return;

        setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'graduating' } : c));
        
        try {
            const batch = writeBatch(firestore);
            const studentDocs = await getDocs(query(collection(firestore, 'alunos'), where('__name__', 'in', targetClass.studentIds)));

            studentDocs.forEach(studentDoc => {
                const studentData = studentDoc.data();
                // Create a new document in 'exalunos' with the same ID and data
                const exAlunoRef = doc(firestore, 'exalunos', studentDoc.id);
                batch.set(exAlunoRef, { ...studentData, status: 'FORMADO' });
                
                // Delete the old document from 'alunos'
                batch.delete(studentDoc.ref);
            });

            await batch.commit();

            setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'done' } : c));
            toast({
                title: 'Turma Formada com Sucesso!',
                description: `${targetClass.studentCount} alunos da turma ${targetClass.fromSerie} ${targetClass.turma} foram movidos para ex-alunos.`
            });

        } catch (error) {
            console.error("Error graduating class:", error);
            setMigrationClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'error' } : c));
            toast({ variant: 'destructive', title: 'Erro ao formar turma.', description: 'Não foi possível mover os alunos.' });
        } finally {
            setAlertInfo(null);
        }
    };


    const handleMigrateClass = async (classId: string) => {
        if (!firestore) return;
        
        const targetClass = migrationClasses.find(c => c.id === classId);
        if (!targetClass || !targetClass.toSerie) return;

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
                        Esta ferramenta promove os alunos para a próxima série. Alunos do 9º ano são movidos para a base de dados de ex-alunos. 
                        A operação é díficil de reverter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Turma Atual</TableHead>
                                <TableHead>Nova Situação</TableHead>
                                <TableHead className="text-center">Nº de Alunos</TableHead>
                                <TableHead className="text-right">Ação</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {migrationClasses.map((mc) => (
                                <TableRow key={mc.id}>
                                    <TableCell className="font-medium">{`${mc.fromSerie} ${mc.turma} (${mc.turno})`}</TableCell>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        {mc.toSerie ? (
                                            <>
                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                <span>{`${mc.toSerie} ${mc.turma} (${mc.turno})`}</span>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <GraduationCap className="h-4 w-4" />
                                                <span>Formandos (Ex-alunos)</span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">{mc.studentCount}</TableCell>
                                    <TableCell className="text-right">
                                        {mc.status === 'pending' && (
                                             mc.toSerie ? (
                                                <Button onClick={() => setAlertInfo({ classId: mc.id, studentCount: mc.studentCount, isGraduating: false })}>
                                                    <GitBranch className="mr-2 h-4 w-4" />
                                                    Migrar Turma
                                                </Button>
                                             ) : (
                                                <Button variant="secondary" onClick={() => setAlertInfo({ classId: mc.id, studentCount: mc.studentCount, isGraduating: true })}>
                                                    <GraduationCap className="mr-2 h-4 w-4" />
                                                    Formar Turma
                                                </Button>
                                             )
                                        )}
                                        {(mc.status === 'migrating' || mc.status === 'graduating') && (
                                            <Button disabled>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                A processar...
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
                            <AlertDialogTitle>
                                {alertInfo.isGraduating ? 'Confirmar Formatura da Turma?' : 'Confirmar Migração de Turma?'}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {alertInfo.isGraduating
                                    ? <>Tem a certeza que deseja formar <strong className='text-foreground'>{alertInfo.studentCount} alunos</strong>? Eles serão movidos para a base de dados de ex-alunos e o seu estado será alterado para "FORMADO".</>
                                    : <>Tem a certeza que deseja migrar <strong className='text-foreground'>{alertInfo.studentCount} alunos</strong>? A série deles será atualizada.</>
                                }
                                <br/><br/>
                                Esta ação é difícil de reverter.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => alertInfo.isGraduating ? handleGraduateClass(alertInfo.classId) : handleMigrateClass(alertInfo.classId)}>
                                {alertInfo.isGraduating ? 'Sim, formar turma' : 'Sim, migrar'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
