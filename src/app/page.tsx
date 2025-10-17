"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { collection, getDocs, query, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import AiAssistant from "@/components/ai-assistant";

export default function Home() {
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    // Select a random quote on client-side mount
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!firestore || !user) return;
    setIsLoading(true);
    setError(null);

    const studentsCollection = collection(firestore, "users", user.uid, "students");
    const q = query(studentsCollection);
    
    getDocs(q).then(querySnapshot => {
      const studentsData: DataItem[] = [];
      querySnapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as DataItem);
      });
      
      studentsData.sort((a, b) => {
        const nameA = a.mainItem || "";
        const nameB = b.mainItem || "";
        return nameA.localeCompare(nameB);
      });

      setData(studentsData);
      setIsLoading(false);
    }).catch(err => {
      const permissionError = new FirestorePermissionError({
        path: studentsCollection.path,
        operation: 'list',
      });
      setError(permissionError);
      errorEmitter.emit('permission-error', permissionError);
      setIsLoading(false);
    });

  }, [firestore, user]);

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      fetchData();
    } else if (!isUserLoading) {
      setIsLoading(false);
    }
  }, [isUserLoading, user, firestore, fetchData]);


  const handleUploadComplete = () => {
    fetchData();
  };

  const handleClearAndReload = async () => {
    if (!firestore || !user) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "O serviço do banco de dados não está disponível ou você não está autenticado.",
      });
      return;
    }
  
    setIsLoading(true);
    const studentsCollection = collection(firestore, "users", user.uid, "students");
    const q = query(studentsCollection);
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const batch = writeBatch(firestore);
      querySnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    setData([]);
    
    toast({
      title: "Dados removidos",
      description: "Os dados anteriores foram limpos. Você já pode carregar um novo arquivo.",
    });

    setIsLoading(false);
  };

  const hasData = data && data.length > 0;

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
        <div className="w-full max-w-4xl mx-auto">
          <header className="text-center mb-8 flex flex-col items-center">
            <div className="mb-4 flex flex-col items-center">
              <Image
                src="/logoyuri.png"
                alt="Logo"
                width={120}
                height={40}
                className="rounded-md"
              />
               {randomQuote && (
                <blockquote className="mt-4 border-l-2 border-primary pl-4 italic text-xs text-muted-foreground">
                  <p>"{randomQuote.quote}"</p>
                  <cite className="mt-2 block text-right font-semibold not-italic">- {randomQuote.author}</cite>
                </blockquote>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary font-headline">
              Gestão de Alunos 2025
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Localize as informações sobre um Aluno matriculado
            </p>
          </header>

          <div className="w-full">
            {isLoading || isUserLoading ? (
              <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Carregando dados...</p>
              </div>
            ) : error ? (
              <div className="text-destructive text-center p-8 bg-destructive/10 rounded-lg">
                <p className="font-bold">Ocorreu um erro ao carregar os dados.</p>
                <p className="text-sm">{error.message}</p>
              </div>
            )
            : !hasData ? (
              <XlsxUploader onUploadComplete={handleUploadComplete} />
            ) : (
              <div className="space-y-4">
                <DataViewer data={data} onEditComplete={fetchData} />
                 <Button onClick={handleClearAndReload} className="w-full" variant="outline">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar dados e carregar novo arquivo
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      <AiAssistant />
    </>
  );
}
