
'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, query, doc, updateDoc, deleteField } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import FileUploaderSheet from './file-uploader-sheet';
import GradesUploaderSheet from './grades-uploader-sheet';
import DataExporter from './data-exporter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Upload, NotebookText, HardDriveDownload, Trash2, Users, Shield, Sparkles } from 'lucide-react';
import UserManager from './user-manager';
import ProfileManager from './profile-manager';

export default function DatabaseManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isCleanupAlertOpen, setIsCleanupAlertOpen] = useState(false);
    
    const onUploadSuccess = () => {
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
            const snapshot = await getDocs(query(studentsCollection));
            
            if (snapshot.empty) {
                toast({ title: "Base de Dados Vazia", description: "Não há alunos para eliminar." });
                setIsDeleting(false);
                setIsDeleteAlertOpen(false);
                return;
            }

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

    const handleCleanupOldBoletimStructure = async () => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Erro de Conexão" });
            return;
        }
    
        setIsCleaning(true);
        toast({ title: "A iniciar limpeza...", description: "A verificar a estrutura dos boletins. Isto pode demorar." });
    
        try {
            const studentsCollection = collection(firestore, 'alunos');
            const snapshot = await getDocs(query(studentsCollection));
    
            if (snapshot.empty) {
                toast({ title: "Nenhum aluno encontrado.", description: "A base de dados de alunos está vazia." });
                setIsCleaning(false);
                setIsCleanupAlertOpen(false);
                return;
            }
    
            let studentsAffectedCount = 0;
            const promises = [];
    
            for (const studentDoc of snapshot.docs) {
                const studentData = studentDoc.data();
                const fieldsToDelete: { [key: string]: any } = {};
                let hasFieldsToDelete = false;
    
                // Lógica para encontrar campos que começam com 'boletim.2025'
                for (const key in studentData) {
                    if (key.startsWith('boletim.2025')) {
                        fieldsToDelete[key] = deleteField();
                        hasFieldsToDelete = true;
                    }
                }
    
                if (hasFieldsToDelete) {
                    studentsAffectedCount++;
                    // Usar updateDoc individualmente para maior fiabilidade com nomes de campos com pontos
                    promises.push(updateDoc(studentDoc.ref, fieldsToDelete));
                }
            }
    
            await Promise.all(promises);
    
            if (studentsAffectedCount > 0) {
                toast({
                    title: "Limpeza Concluída!",
                    description: `Os campos 'boletim.2025' foram removidos de ${studentsAffectedCount} alunos.`,
                });
            } else {
                toast({
                    title: "Nenhuma Limpeza Necessária",
                    description: "Nenhum aluno tinha campos de boletim para o ano de 2025 para serem limpos.",
                });
            }
    
        } catch (error: any) {
            console.error("Error cleaning boletim structure:", error);
            toast({
                variant: "destructive",
                title: "Erro na Limpeza",
                description: error.message || "Não foi possível concluir a limpeza. Tente novamente.",
            });
        } finally {
            setIsCleaning(false);
            setIsCleanupAlertOpen(false);
        }
    };
    
    return (
       <div className="space-y-6">
            <Accordion type="multiple" defaultValue={['import-export']} className="w-full space-y-4">
                <AccordionItem value="import-export">
                    <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 bg-card rounded-lg border">
                        <Upload className="h-5 w-5" /> Importar & Exportar Dados
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
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

                             <Card className="border-destructive/50">
                                <CardHeader>
                                    <CardTitle className='flex items-center gap-2 text-destructive'><Trash2 /> Zona de Perigo</CardTitle>
                                    <CardDescription>Ações permanentes que podem afetar a base de dados. Use com extrema cautela.</CardDescription>
                                </CardHeader>
                                <CardFooter className="flex-col items-start gap-4">
                                     <Button variant="destructive" onClick={() => setIsCleanupAlertOpen(true)} disabled={isCleaning}>
                                        {isCleaning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Limpar Estrutura de Boletins
                                    </Button>
                                    <Button variant="destructive" onClick={() => setIsDeleteAlertOpen(true)} disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Apagar Base de Dados de Alunos
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="users">
                    <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 bg-card rounded-lg border">
                        <Users className="h-5 w-5" /> Gestão de Utilizadores
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <UserManager />
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="profiles">
                    <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 bg-card rounded-lg border">
                        <Shield className="h-5 w-5" /> Gestão de Perfis de Permissão
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <ProfileManager />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>


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

            <AlertDialog open={isCleanupAlertOpen} onOpenChange={setIsCleanupAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Limpeza Completa dos Boletins?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá percorrer todos os alunos e <strong className="text-destructive">APAGARÁ permanentemente</strong> todos os campos que comecem com "boletim.2025".
                             Isto prepara a base de dados para uma reimportação de dados limpa.
                            <br /><br />
                            A ação é <strong className="text-destructive">irreversível</strong>. Deseja continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCleanupOldBoletimStructure} className="bg-destructive hover:bg-destructive/90">
                            Sim, limpar estrutura
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
       </div>
    );
}
