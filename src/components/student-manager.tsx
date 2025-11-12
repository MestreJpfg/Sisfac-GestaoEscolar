
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import { useFirestore } from "@/firebase";
import { getCountFromServer, collection } from "firebase/firestore";
import StudentDataView from "./student-data-view";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { ThemeToggle } from "./theme-toggle";
import ClassListGenerator from "./class-list-generator";
import GradesUploaderSheet from "./grades-uploader-sheet";
import FileUploaderSheet from "./file-uploader-sheet";

export default function StudentManager() {
  const [dataExists, setDataExists] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const updateDateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('pt-BR', { dateStyle: 'full' });
      const timePart = now.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
      setCurrentDateTime(`${datePart} - ${timePart}`);
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!firestore) return;

    const checkDataExists = async () => {
      try {
        const collectionRef = collection(firestore, 'alunos');
        const snapshot = await getCountFromServer(collectionRef);
        setDataExists(snapshot.data().count > 0);
      } catch (error) {
        if (error instanceof Error && (error.message.includes('permission-denied') || error.message.includes('insufficient permissions'))) {
          const permissionError = new FirestorePermissionError({
            path: 'alunos',
            operation: 'list',
          });
          errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Failed to check if data exists:", error);
        }
        setDataExists(false); // Assume no data if check fails
      }
    };
    
    checkDataExists();
  }, [firestore]);
  
  const isPageLoading = dataExists === null;

  const onUploadSuccess = () => {
    setDataExists(true);
    setIsUploading(false);
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 non-printable">
        <div className="w-full max-w-7xl mx-auto flex-1">
          <header className="text-center mb-8 flex flex-col items-center relative">
            <div className="absolute top-0 right-0">
              <ThemeToggle />
            </div>
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
              {dataExists ? "Filtre e visualize os dados dos alunos ou utilize os botões de ação." : "Carregue o ficheiro de alunos para iniciar a gestão."}
            </p>
          </header>

          <div className="w-full">
            {isPageLoading || isUploading ? (
              <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">{isUploading ? "Aguarde, a processar e carregar os dados..." : "A verificar a base de dados..."}</p>
              </div>
            ) : dataExists ? (
                <StudentDataView />
            ) : (
                <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
                    <p className="text-muted-foreground mb-4">Nenhum dado encontrado. Comece por carregar os dados dos alunos.</p>
                    <FileUploaderSheet onUploadSuccess={onUploadSuccess} isPrimaryAction={true}/>
                </div>
            )}
          </div>
        </div>
        <footer className="w-full max-w-7xl mx-auto mt-12 py-4 text-center text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} MestreJp. Todos os direitos reservados.</p>
        </footer>
      </main>
      
      {dataExists && !isPageLoading && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50 non-printable">
            <GradesUploaderSheet />
            <FileUploaderSheet onUploadSuccess={onUploadSuccess} />
            <ClassListGenerator />
        </div>
      )}
    </>
  );
}
