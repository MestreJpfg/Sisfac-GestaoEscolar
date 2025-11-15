
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Plus, X } from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { UserNav } from "./auth/user-nav";

export default function StudentManager() {
  const [dataExists, setDataExists] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

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
    setIsFabMenuOpen(false);
  }

  const fabItems = [
    { component: <ClassListGenerator key="class-list" /> },
    { component: <FileUploaderSheet key="file-upload" onUploadSuccess={onUploadSuccess} /> },
    { component: <GradesUploaderSheet key="grades-upload" /> },
  ].reverse(); // Reverse to have the main action on top

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 non-printable">
        <div className="w-full max-w-7xl mx-auto flex-1">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex flex-col items-start">
                <Image
                    src="/logoyuri.png"
                    alt="Logo"
                    width={100}
                    height={33}
                    className="rounded-md"
                />
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary [text-shadow:0_2px_10px_hsl(var(--primary)/0.4)] font-headline mt-2">
                    Gestão de Alunos 2025
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm max-w-lg">
                  {dataExists ? "Filtre e visualize os dados dos alunos ou utilize os botões de ação." : "Carregue o ficheiro de alunos para iniciar a gestão."}
                </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserNav />
            </div>
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
        <div className="fixed bottom-6 right-6 flex flex-col items-end gap-4 z-50 non-printable">
          <AnimatePresence>
            {isFabMenuOpen && (
              <motion.div
                className="flex flex-col items-end gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {fabItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: index * 0.1 } }}
                    exit={{ opacity: 0, y: 20, transition: { delay: index * 0.05 } }}
                  >
                    {item.component}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            className="h-16 w-16 rounded-full shadow-lg p-0 flex items-center justify-center"
            aria-expanded={isFabMenuOpen}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={isFabMenuOpen ? "x" : "plus"}
                initial={{ rotate: -45, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 45, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
                className="absolute"
              >
                {isFabMenuOpen ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
              </motion.div>
            </AnimatePresence>
          </Button>
        </div>
      )}
    </>
  );
}
