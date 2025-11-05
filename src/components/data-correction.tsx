
"use client";

import { useState } from "react";
import { useFirestore } from "@/firebase";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function DataCorrection() {
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleDateMigration = async () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "A conexão com a base de dados não foi estabelecida.",
      });
      return;
    }

    setIsLoading(true);
    toast({
      title: "Iniciando correção de datas...",
      description: "A ler todos os dados dos alunos. Isto pode demorar um pouco.",
    });

    try {
      const alunosCollectionRef = collection(firestore, "alunos");
      const querySnapshot = await getDocs(alunosCollectionRef);

      if (querySnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Nenhum Aluno Encontrado",
          description: "Não há alunos na base de dados para corrigir.",
        });
        setIsLoading(false);
        return;
      }
      
      const batch = writeBatch(firestore);
      let correctedCount = 0;

      querySnapshot.forEach((document) => {
        const student = document.data();
        const docRef = doc(firestore, "alunos", document.id);

        if (student.data_nascimento && typeof student.data_nascimento === 'string') {
          const parts = student.data_nascimento.split('/');
          if (parts.length === 3) {
            const [day, month, year] = parts.map(Number);
            const originalDate = new Date(year, month - 1, day);
            
            if (!isNaN(originalDate.getTime())) {
              originalDate.setDate(originalDate.getDate() + 1);
              
              const newDay = String(originalDate.getDate()).padStart(2, '0');
              const newMonth = String(originalDate.getMonth() + 1).padStart(2, '0');
              const newYear = originalDate.getFullYear();
              
              const newDateString = `${newDay}/${newMonth}/${newYear}`;
              
              batch.update(docRef, { data_nascimento: newDateString });
              correctedCount++;
            }
          }
        }
      });

      if (correctedCount > 0) {
        await batch.commit();
        toast({
          title: "Correção Concluída!",
          description: `${correctedCount} registos de alunos foram atualizados com sucesso.`,
        });
      } else {
        toast({
            variant: "destructive",
            title: "Nenhuma Data para Corrigir",
            description: "Não foram encontrados registos com datas de nascimento no formato esperado (DD/MM/YYYY).",
        });
      }

    } catch (error) {
      console.error("Erro durante a migração de datas:", error);
      toast({
        variant: "destructive",
        title: "Erro na Correção",
        description: "Ocorreu um erro ao tentar corrigir as datas de nascimento.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6 bg-destructive/10 border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle />
          Ação de Correção de Dados
        </CardTitle>
        <CardDescription className="text-destructive/80">
          Utilize esta ferramenta para corrigir um erro nas datas de nascimento de todos os alunos, adicionando 1 dia a cada uma. 
          Use com cuidado, esta ação é irreversível.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A Corrigir...
                </>
              ) : (
                "Iniciar Correção de Datas de Nascimento"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação modificará a data de nascimento de <span className="font-bold">todos os alunos</span> na base de dados, adicionando um dia. Esta operação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDateMigration}>Sim, continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
