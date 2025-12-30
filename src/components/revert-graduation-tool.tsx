
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Undo2, AlertCircle, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface GraduatedClass {
    id: string;
    description: string;
    studentCount: number;
    studentIds: string[];
    status: 'pending' | 'reverting' | 'done' | 'error';
}

export default function RevertGraduationTool() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [graduatedClasses, setGraduatedClasses] = useState<GraduatedClass[]>([]);
    const [alertInfo, setAlertInfo] = useState<{ classId: string; description: string; studentCount: number } | null>(null);

    useEffect(() => {
        const fetchGraduatedStudents = async () => {
            if (!firestore) return;
            setIsLoading(true);

            try {
                const q = query(collection(firestore, 'exalunos'), where('status', '==', 'FORMADO'));
                const snapshot = await getDocs(q);
                const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const classes = students.reduce((acc, student) => {
                    const { serie, classe, turno } = student;
                    if (!serie || !classe || !turno) return acc;

                    const classKey = `${serie}-${classe}-${turno}`;
                    if (!acc[classKey]) {
                        acc[classKey] = {
                            id: classKey,
                            description: `${serie} ${classe} (${turno})`,
                            studentCount: 0,
                            studentIds: [],
                            status: 'pending',
                        };
                    }
                    acc[classKey].studentCount++;
                    acc[classKey].studentIds.push(student.id);
                    return acc;
                }, {} as { [key: string]: GraduatedClass });

                const sortedClasses = Object.values(classes).sort((a, b) => a.description.localeCompare(b.description));
                setGraduatedClasses(sortedClasses);

            } catch (error) {
                console.error("Error fetching graduated students:", error);
                toast({ variant: 'destructive', title: 'Erro ao carregar formandos.' });
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'exalunos',
                    operation: 'list',
                }));
            } finally {
                setIsLoading(false);
            }
        };

        fetchGraduatedStudents();
    }, [firestore, toast]);

    const handleRevertClass = async (classId: string) => {
        if (!firestore) return;

        const targetClass = graduatedClasses.find(c => c.id === classId);
        if (!targetClass) return;

        setGraduatedClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'reverting' } : c));

        let hasError = false;

        for (const studentId of targetClass.studentIds) {
            try {
                const exAlunoRef = doc(firestore, 'exalunos', studentId);
                const exAlunoSnap = await getDoc(exAlunoRef);

                if (exAlunoSnap.exists()) {
                    const studentData = exAlunoSnap.data();
                    const { status, ...originalData } = studentData; // Remove o status 'FORMADO'

                    const alunoRef = doc(firestore, 'alunos', studentId);

                    setDocumentNonBlocking(alunoRef, originalData);
                    deleteDocumentNonBlocking(exAlunoRef);
                }
            } catch (error) {
                console.error(`Failed to revert student ${studentId}:`, error);
                hasError = true;
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: `exalunos/${studentId}`,
                    operation: 'delete',
                }));
            }
        }
        
        // Delay to give UI feedback and allow non-blocking operations to be noticed
        setTimeout(() => {
            if (hasError) {
                setGraduatedClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'error' } : c));
                toast({
                    variant: 'destructive',
                    title: 'Erro na Reversão',
                    description: 'Não foi possível reverter todos os alunos. Verifique as permissões e tente novamente.'
                });
            } else {
                setGraduatedClasses(prev => prev.filter(c => c.id !== classId));
                toast({
                    title: 'Reversão Concluída!',
                    description: `${targetClass.studentCount} alunos da turma ${targetClass.description} foram movidos de volta para a base de dados de alunos ativos.`
                });
            }
        }, 1500);

        setAlertInfo(null);
    };
    
    if (isLoading) {
        return (
            <div className="flex h-48 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">A procurar turmas de formandos...</p>
            </div>
        );
    }
    
    if (graduatedClasses.length === 0) {
        return (
             <div className="text-center py-10 text-muted-foreground">
                <Search className="mx-auto h-10 w-10 mb-4" />
                <p>Nenhuma turma de formandos encontrada na base de dados de ex-alunos.</p>
            </div>
        )
    }

    return (
        <>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Turma Formada</TableHead>
                            <TableHead className="text-center">Nº de Alunos</TableHead>
                            <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {graduatedClasses.map((gc) => (
                            <TableRow key={gc.id}>
                                <TableCell className="font-medium">{gc.description}</TableCell>
                                <TableCell className="text-center">{gc.studentCount}</TableCell>
                                <TableCell className="text-right">
                                    {gc.status === 'pending' && (
                                        <Button variant="destructive" size="sm" onClick={() => setAlertInfo({ classId: gc.id, description: gc.description, studentCount: gc.studentCount })}>
                                            <Undo2 className="mr-2 h-4 w-4" />
                                            Reverter Formatura
                                        </Button>
                                    )}
                                    {gc.status === 'reverting' && (
                                        <Button variant="destructive" size="sm" disabled>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            A reverter...
                                        </Button>
                                    )}
                                    {gc.status === 'error' && (
                                        <div className="flex items-center justify-end gap-2 text-destructive">
                                            <AlertCircle className="h-5 w-5" />
                                            <span className="font-semibold">Erro</span>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
             {alertInfo && (
                <AlertDialog open={!!alertInfo} onOpenChange={() => setAlertInfo(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Reverter Formatura da Turma?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Tem a certeza que deseja reverter a formatura da turma <strong className='text-foreground'>{alertInfo.description}</strong>? 
                                <br/><br/>
                                Os <strong className='text-foreground'>{alertInfo.studentCount} alunos</strong> serão movidos de "Ex-Alunos" de volta para "Alunos" e o seu estado "FORMADO" será removido.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevertClass(alertInfo.classId)} className="bg-destructive hover:bg-destructive/90">
                                Sim, reverter formatura
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
