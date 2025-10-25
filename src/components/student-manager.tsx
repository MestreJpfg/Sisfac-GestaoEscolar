
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
import { Loader2, BellRing, Trash2, Bot, List } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";
import { useFirestore, useUser, errorEmitter, setDocumentNonBlocking, useCollection, useMemoFirebase, commitBatchNonBlocking } from "@/firebase";
import { collection, writeBatch, doc, getDocs, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useFcm } from "@/hooks/use-fcm";
import { quotes } from "@/lib/quotes";
import { useRouter } from "next/navigation";
import { FirestorePermissionError } from "@/firebase/errors";
import AiAssistant from "./ai-assistant";
import ListGenerator from "./list-generator";
import EditStudentForm from "./edit-student-form";
import DeclarationGenerator from "./declaration-generator";
import { AnimatePresence } from "framer-motion";

export default function StudentManager() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { notificationPermission, requestPermissionAndGetToken } = useFcm();
  const router = useRouter();

  // State for UI management
  const [isClearing, setIsClearing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState('');
  
  // State for dialogs
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isListGeneratorOpen, setIsListGeneratorOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<DataItem | null>(null);
  const [declarationStudent, setDeclarationStudent] = useState<DataItem | null>(null);
  
  
  // Memoize the query to prevent re-renders
  const studentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "students"));
  }, [firestore]);

  // Fetch data directly on the client using useCollection
  const { data: studentData, isLoading: isDataLoading, error: dataError } = useCollection<DataItem>(studentsQuery);
  const [data, setData] = useState<DataItem[]>([]);
  
  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const now = new Date();
    const datePart = now.toLocaleDateString('pt-BR', { dateStyle: 'full' });
    const timePart = now.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    setCurrentDateTime(`${datePart} - ${timePart}`);
  }, []);

  useEffect(() => {
    if (studentData) {
      const sorted = [...studentData].sort((a, b) => (a.mainItem || "").localeCompare(b.mainItem || ""));
      setData(sorted);
    } else {
      setData([]);
    }
  }, [studentData]);

  const handleUploadComplete = (uploadedData: DataItem[]) => {
    // useCollection will update the data automatically, but we can stop the uploader's loading state
    setIsUploading(false);
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
        
        // Use non-blocking commit with error handling
        commitBatchNonBlocking(batch, studentsRef.path);
        
        toast({
          title: "Dados removidos",
          description: "A base de dados foi limpa. Pode carregar um novo ficheiro.",
        });
      }
    } catch(err: any) {
        const permissionError = new FirestorePermissionError({
            path: studentsRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    } finally {
        setIsClearing(false);
        setIsClearConfirmOpen(false); // Close the dialog
    }
  };
  
  const handleEditComplete = (updatedStudent: DataItem) => {
    const updatedData = data.map(item =>
        item.id === updatedStudent.id ? updatedStudent : item
    );
     const sortedData = updatedData.sort((a, b) => (a.mainItem || "").localeCompare(b.mainItem || ""));
    setData(sortedData);
    setEditingStudent(null);
  }

  const handleConfirmClear = () => {
    if (passwordInput === "2910") {
      setPasswordInput("");
      handleClearAndReload();
    } else {
      toast({
        variant: "destructive",
        title: "Senha Incorreta",
        description: "A senha para limpar os dados está incorreta. A operação foi cancelada.",
      });
      setPasswordInput("");
      setIsClearConfirmOpen(false);
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
            // Use non-blocking update
            setDocumentNonBlocking(userDocRef, { fcmTokens: { [token]: true } }, { merge: true });
            toast({
              title: 'Sucesso!',
              description: 'As notificações foram ativadas para este dispositivo.'
            });
        }
    }
  };
  
  // --- AI Assistant action handlers ---
  const handleRequestEditStudent = useCallback((studentId: string) => {
    const studentToEdit = data.find(s => s.id === studentId);
    if (studentToEdit) {
        setEditingStudent(studentToEdit);
    } else {
        toast({ variant: 'destructive', title: 'Aluno não encontrado' });
    }
  }, [data, toast]);

  const handleRequestGenerateDeclaration = useCallback((studentId: string) => {
    const studentToDeclare = data.find(s => s.id === studentId);
    if (studentToDeclare) {
        setDeclarationStudent(studentToDeclare);
    } else {
        toast({ variant: 'destructive', title: 'Aluno não encontrado' });
    }
  }, [data, toast]);

  const handleRequestCreateList = useCallback(() => {
    setIsListGeneratorOpen(true);
  }, []);
  // --- End of AI handlers ---


  const isPageLoading = isDataLoading || isUserLoading || isClearing || isUploading;
  const hasData = !isPageLoading && data.length > 0;

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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary [text-shadow:0_2px_10px_hsl(var(--primary)/0.4)] font-headline">
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
              <p className="mt-4 text-muted-foreground">Aguarde, a carregar dados...</p>
            </div>
          ) : !hasData ? (
            <XlsxUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsUploading} />
          ) : (
            <div className="space-y-4">
              <DataViewer data={data} onEditComplete={handleEditComplete} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button onClick={() => setIsClearConfirmOpen(true)} variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar e Carregar Novo
                </Button>
                <Button onClick={() => setIsAssistantOpen(true)} variant="outline">
                   <Bot className="mr-2 h-4 w-4" />
                   Assistente Virtual
                </Button>
              </div>
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
                <Button type="button" variant="secondary" onClick={() => { setPasswordInput(""); setIsClearConfirmOpen(false); }}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmClear}
                disabled={isClearing}
              >
                {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar e Limpar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isAssistantOpen && 
            <AiAssistant 
                onClose={() => setIsAssistantOpen(false)}
                onRequestEditStudent={handleRequestEditStudent}
                onRequestGenerateDeclaration={handleRequestGenerateDeclaration}
                onRequestCreateList={handleRequestCreateList} 
            />}
        
        {hasData && (
          <>
            <Button 
              className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-2xl" 
              size="icon"
              onClick={() => setIsListGeneratorOpen(true)}
            >
              <List className="h-6 w-6" />
              <span className="sr-only">Gerar Lista de Alunos</span>
            </Button>
            <AnimatePresence>
            {isListGeneratorOpen && (
              <ListGenerator
                allStudents={data}
                onClose={() => setIsListGeneratorOpen(false)}
              />
            )}
            </AnimatePresence>
          </>
        )}
        
        {/* Render Dialogs triggered by AI or other components */}
        {editingStudent && (
          <EditStudentForm
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onEditComplete={handleEditComplete}
          />
        )}
        {declarationStudent && (
          <DeclarationGenerator
            student={declarationStudent}
            onClose={() => setDeclarationStudent(null)}
          />
        )}
    </main>
  );
}
