
'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function DataRecoveryTool() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isRecovering, setIsRecovering] = useState(false);

    const handleRestoreGrades = async () => {
        if (!firestore) return;

        setIsRecovering(true);
        toast({
            title: "A iniciar reconciliação...",
            description: "A verificar duplicados e notas perdidas. Isto pode demorar.",
        });

        try {
            // 1. Buscar todos os alunos de ambas as coleções
            const [exSnapshot, activeSnapshot] = await Promise.all([
                getDocs(collection(firestore, 'exalunos')),
                getDocs(collection(firestore, 'alunos'))
            ]);

            const activeStudentsMap = new Map();
            activeSnapshot.forEach(d => activeStudentsMap.set(String(d.id), { ref: d.ref, data: d.data() }));

            let batch = writeBatch(firestore);
            let restoredCount = 0;
            let operationsInBatch = 0;

            // 2. Iterar sobre ex-alunos para encontrar quem deveria estar ativo com as suas notas
            for (const exDoc of exSnapshot.docs) {
                const exData = exDoc.data();
                const studentId = String(exDoc.id);
                const activeRecord = activeStudentsMap.get(studentId);

                // Se o aluno existe nos ativos mas o boletim está vazio ou incompleto no ativo,
                // e o ex-aluno tem um boletim populado.
                if (activeRecord && exData.boletim && Object.keys(exData.boletim).length > 0) {
                    const activeData = activeRecord.data;
                    
                    // Mesclar o boletim do ex-aluno para o ativo
                    // Priorizamos o que está em ex-alunos pois é onde as notas "pararam"
                    const mergedBoletim = { 
                        ...(activeData.boletim || {}), 
                        ...exData.boletim 
                    };

                    batch.update(activeRecord.ref, { 
                        boletim: mergedBoletim,
                        status: 'ATIVO',
                        updatedAt: new Date().toISOString()
                    });

                    // Remover do ex-alunos pois ele já está ativo
                    batch.delete(exDoc.ref);
                    
                    restoredCount++;
                    operationsInBatch += 2;

                    // Firestore limit is 500 per batch. We use 450 to be safe.
                    if (operationsInBatch >= 450) {
                        await batch.commit();
                        batch = writeBatch(firestore);
                        operationsInBatch = 0;
                    }
                }
            }

            if (operationsInBatch > 0) {
                await batch.commit();
            }

            if (restoredCount > 0) {
                toast({
                    title: "Recuperação Concluída!",
                    description: `${restoredCount} alunos tiveram as suas notas restauradas e foram removidos dos transferidos.`,
                });
            } else {
                toast({
                    title: "Nada a recuperar",
                    description: "Não foram encontrados alunos ativos que estivessem duplicados nos transferidos com notas.",
                });
            }

        } catch (error: any) {
            console.error("Erro na recuperação de dados:", error);
            toast({
                variant: "destructive",
                title: "Erro Crítico",
                description: "Ocorreu um erro ao tentar reconciliar os dados. Tente novamente.",
            });
        } finally {
            setIsRecovering(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950/20" disabled={isRecovering}>
                    {isRecovering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Reconciliar Notas (Ativos vs Transferidos)
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Confirmar Reconciliação de Notas
                    </AlertTriangle>
                    <AlertDialogDescription>
                        Esta ação irá procurar alunos que aparecem tanto na lista de **Ativos** quanto na de **Transferidos**.
                        <br /><br />
                        As notas encontradas no registo de "Transferido" serão movidas para o registo "Ativo" e o duplicado será eliminado. 
                        Use isto para corrigir importações onde os alunos ativos perderam o seu histórico de notas.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRestoreGrades} className="bg-yellow-600 hover:bg-yellow-700">
                        Iniciar Reconciliação
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
