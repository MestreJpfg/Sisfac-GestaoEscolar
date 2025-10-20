
"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, BellRing, Trash2 } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";
import { useFirestore, useUser, updateDocumentNonBlocking } from "@/firebase";
import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useFcm } from "@/hooks/use-fcm";
import { quotes } from "@/lib/quotes";
import AiAssistant from "@/components/ai-assistant";
import { useRouter } from "next/navigation";
import { getStudentData } from "@/services/student-service";
import { FirestorePermissionError } from "@/firebase";


export default function Home() {
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [isClearing, setIsClearing] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { notificationPermission, requestPermissionAndGetToken } = useFcm();
  const router = useRouter();


  const fetchExistingData = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
        const studentData = await getStudentData(firestore);
         const sortedData = studentData.sort((a, b) => {
            const nameA = a.mainItem || "";
            const nameB = b.mainItem || "";
            return nameA.localeCompare(nameB);
        });
        setData(sortedData);
    } catch (error) {
        if (error instanceof FirestorePermissionError) {
          throw error;
        }
        console.error("Failed to fetch initial data", error);
        toast({
            variant: "destructive",
            title: "Erro ao carregar dados",
            description: "Não foi possível buscar os dados existentes. Tente atualizar a página.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    fetchExistingData();
  }, [fetchExistingData]);


  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const now = new Date();
    const datePart = now.toLocaleDateString('pt-BR', { dateStyle: 'full' });
    const timePart = now.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    setCurrentDateTime(`${datePart} - ${timePart}`);
  }, []);

  const handleUploadComplete = (uploadedData: DataItem[]) => {
    const sortedData = uploadedData.sort((a, b) => {
      const nameA = a.mainItem || "";
      const nameB = b.mainItem || "";
      return nameA.localeCompare(nameB);
    });
    setData(sortedData);
    setIsLoading(false);
  };

  const handleClearAndReload = async () => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "O serviço do banco de dados não está disponível.",
      });
      return;
    }
    setIsClearing(true);
    const studentsRef = collection(firestore, "students");
    
    try {
      const querySnapshot = await getDocs(studentsRef);
      if (querySnapshot.empty) {
        toast({
          title: "Nenhum dado para limpar",
          description: "A base de dados já está vazia.",
        });
      } else {
        const batch = writeBatch(firestore);
        querySnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        toast({
          title: "Dados removidos",
          description: "Os dados anteriores foram limpos. Você já pode carregar um novo arquivo.",
        });
      }
    } catch(err: any) {
        if (err.code === 'permission-denied') {
            throw new FirestorePermissionError({
                path: studentsRef.path,
                operation: 'delete',
            });
        }
        console.error("Error clearing data:", err);
        toast({
          variant: "destructive",
          title: "Erro ao Limpar",
          description: "Não foi possível remover os dados. Verifique a consola para mais detalhes."
        });
    } finally {
        setIsClearing(false);
        setData([]);
    }
  };
  
  const handleEditComplete = (updatedStudent: DataItem) => {
    setData(prevData => {
        const updatedData = prevData.map(item =>
            item.id === updatedStudent.id ? updatedStudent : item
        );
        return updatedData;
    });
  }

  const handleConfirmClear = () => {
    if (passwordInput === "2910") {
      setIsClearConfirmOpen(false);
      setPasswordInput("");
      handleClearAndReload();
    } else {
      toast({
        variant: "destructive",
        title: "Senha Incorreta",
        description: "A senha para limpar os dados está incorreta. A operação foi cancelada.",
      });
      setPasswordInput("");
    }
  };

  const handleNotificationAction = async () => {
    if (notificationPermission === 'granted') {
      toast({
        title: "🔔 Notificação de Teste",
        description: "Se você pode ver isto, o sistema de notificações em primeiro plano está a funcionar!",
      });
    } else if (user && firestore) {
        const token = await requestPermissionAndGetToken();
        if (token) {
            const userDocRef = doc(firestore, 'users', user.uid);
            updateDocumentNonBlocking(userDocRef, { fcmTokens: { [token]: true } });
            toast({
            title: 'Sucesso!',
            description: 'As notificações foram ativadas para este dispositivo.'
            });
        }
    }
  };
  
  const isPageLoading = isLoading || isClearing;
  const hasData = data.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4 flex flex-col items-center">
            <Image
              src="/logoyuri.png"
              alt="Logo"
              width={120}
              height={40}
              className="rounded-md shadow-lg"
            />
             <p className="w-full text-center text-xs text-muted-foreground mt-2">{currentDateTime}</p>
             {randomQuote && (
              <blockquote className="mt-4 max-w-md border-l-2 border-primary/50 pl-4 italic text-xs text-muted-foreground">
                <p>"{randomQuote.quote}"</p>
                <cite className="mt-2 block text-right font-semibold not-italic">- {randomQuote.author}</cite>
              </blockquote>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground font-headline">
            Gestão de Alunos 2025
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base max-w-lg mx-auto">
            Localize as informações sobre um Aluno matriculado ou carregue um novo arquivo de dados.
          </p>
        </header>

        <div className="w-full">
          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Aguarde...</p>
            </div>
          ) : !hasData ? (
            <XlsxUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} />
          ) : (
            <div className="space-y-4">
              <DataViewer data={data} onEditComplete={handleEditComplete} />
               <Button onClick={() => setIsClearConfirmOpen(true)} className="w-full" variant="outline">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar dados e carregar novo arquivo
              </Button>
              {notificationPermission !== 'denied' && user && (
                <Button onClick={handleNotificationAction} className="w-full" variant="secondary">
                  <BellRing className="mr-2 h-4 w-4" />
                  {notificationPermission === 'granted' ? 'Testar Notificação' : 'Ativar Notificações'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <AiAssistant />
       <Dialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar Limpeza de Dados</DialogTitle>
              <DialogDescription>
                Esta ação removerá permanentemente todos os dados dos alunos da base de dados. Para confirmar, por favor, insira a senha de 4 dígitos.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="password">Senha de Confirmação</Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                maxLength={4}
                placeholder="****"
                className="mt-2"
                autoFocus
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => setPasswordInput("")}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmClear}
              >
                Confirmar e Limpar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </main>
  );
}
