
'use client';

import { useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import FileUploaderSheet from './file-uploader-sheet';
import GradesUploaderSheet from './grades-uploader-sheet';
import DataExporter from './data-exporter';
import ClassListGenerator from './class-list-generator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Loader2, Upload, NotebookText, HardDriveDownload, ClipboardList, Trash2 } from 'lucide-react';

export default function DatabaseManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    
    // We need the student data for the ClassListGenerator
    const studentsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'alunos'), orderBy('nome'));
    }, [firestore]);

    const { data: students, isLoading: isDataLoading } = useCollection(studentsQuery);

    const onUploadSuccess = () => {
        // The useCollection hook will automatically update the UI.
        // We can add a toast message here if desired.
        toast({
            title: "Operação Concluída",
            description: "Os dados foram enviados para a base de dados.",
        });
    };

    const handleDeleteAllStudents = async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Erro de Conexão" });
            return;
        }

        setIsDeleting(true);
        toast({ title: "A eliminar dados...", description: "Por favor, aguarde." });

        try {
            const studentsCollection = collection(firestore, 'alunos');
            const snapshot = await getDocs(studentsCollection);
            
            if (snapshot.empty) {
                toast({ title: "Base de Dados Vazia", description: "Não há alunos para eliminar." });
                setIsDeleting(false);
                setIsDeleteAlertOpen(false);
                return;
            }

            // Firestore allows a maximum of 500 operations per batch
            const batchSize = 500;
            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = writeBatch(firestore);
                const chunk = snapshot.docs.slice(i, i + batchSize);
                chunk.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }

            toast({
                title: "Sucesso!",
                description: `Todos os ${snapshot.docs.length} registos de alunos foram eliminados.`,
            });

        } catch (error: any) {
            console.error("Error deleting all students: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao Eliminar",
                description: error.message || "Não foi possível eliminar os dados. Tente novamente.",
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteAlertOpen(false);
        }
    };


    return (
       <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><Upload /> Carregar Alunos</CardTitle>
                    <CardDescription>Adicionar ou atualizar a lista principal de alunos a partir de um ficheiro (XLSX, CSV, JSON).</CardDescription>
                </CardHeader>
                <CardFooter>
                    <FileUploaderSheet onUploadSuccess={onUploadSuccess} />
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><NotebookText /> Carregar Notas</CardTitle>
                    <CardDescription>Fazer o upload das notas dos alunos para uma etapa específica a partir de um ficheiro XLSX.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <GradesUploaderSheet />
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><HardDriveDownload /> Exportar Dados</CardTitle>
                    <CardDescription>Fazer o download de todos os dados dos alunos, incluindo notas, num único ficheiro XLSX.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <DataExporter />
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2'><ClipboardList /> Gerar Listas de Turma</CardTitle>
                    <CardDescription>Criar listas de alunos em formato PDF, filtradas por turma, para impressão.</CardDescription>
                </CardHeader>
                <CardFooter>
                    {isDataLoading ? (
                        <Button disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" /> A carregar...</Button>
                    ) : (
                        <ClassListGenerator allStudents={students || []} />
                    )}
                </CardFooter>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-destructive'><Trash2 /> Zona de Perigo</CardTitle>
                    <CardDescription>Ações permanentes que não podem ser desfeitas. Use com extrema cautela.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Apagar Base de Dados de Alunos
                    </Button>
                </CardFooter>
            </Card>
        </div>

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isto irá apagar permanentemente <strong className="text-destructive">TODOS</strong> os registos de alunos da base de dados.
                        <br /><br />
                        Tem a certeza que quer continuar?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAllStudents} className="bg-destructive hover:bg-destructive/90">
                        Sim, apagar tudo
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
       </>
    );
}
