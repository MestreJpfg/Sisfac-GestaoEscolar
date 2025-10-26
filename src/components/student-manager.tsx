"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import FileUploader from "@/components/file-uploader";
import { Loader2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import { useFirestore, useUser } from "@/firebase";
import { writeBatch, doc, getCountFromServer, collection } from "firebase/firestore";
import StudentDataView from "./student-data-view";
import { useToast } from "@/hooks/use-toast";

export default function StudentManager() {
  const [dataExists, setDataExists] = useState<boolean | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();
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

  const checkDataExists = useCallback(async () => {
    if (!firestore) return;
    try {
      const collectionRef = collection(firestore, 'alunos');
      const snapshot = await getCountFromServer(collectionRef);
      const exists = snapshot.data().count > 0;
      setDataExists(exists);
    } catch (error) {
      console.error("Error checking for existing data:", error);
      setDataExists(false); // Assume no data if check fails
    }
  }, [firestore]);

  useEffect(() => {
    if (firestore && user) {
      checkDataExists();
    }
  }, [firestore, user, checkDataExists]);


  const normalizeData = (data: any[]): any[] => {
    if (!data || data.length < 2) return [];

    const headers: string[] = data[0].map((header: any) => 
      String(header).trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    );
    
    const rmIndex = headers.indexOf('rm');
    if (rmIndex === -1) {
      toast({
        variant: "destructive",
        title: "Coluna 'RM' não encontrada",
        description: "A planilha precisa ter uma coluna 'RM' para identificar cada aluno.",
      });
      return [];
    }

    return data.slice(1).map(row => {
      const student: any = {};
      row.forEach((value: any, index: number) => {
        const header = headers[index];
        if (!header) return;

        let processedValue = value;
        const stringValue = String(value).trim().toUpperCase();

        if (stringValue === "SIM") {
          processedValue = true;
        } else if (stringValue === "NÃO" || stringValue === "NAO") {
          processedValue = false;
        } else if (value === null || String(value).trim() === '') {
          processedValue = null;
        }

        if (header === 'telefones' && value) {
          processedValue = String(value).split(/[,;/]/).map(phone => phone.trim()).filter(p => p);
        }
        
        if (header === 'data_nascimento' && value) {
          // Assuming the date is in a format Excel can parse, then it becomes a number
          if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            processedValue = ('0' + date.getDate()).slice(-2) + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + date.getFullYear();
          }
          // Can add more parsing for string dates if needed
        }


        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);

      return student;
    }).filter(Boolean);
  };

  const handleUploadComplete = async (data: any[]) => {
    if (!firestore || !user) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "A conexão com a base de dados não está disponível.",
      });
      return;
    }

    setIsUploading(true);

    try {
      const normalizedStudents = normalizeData(data);
      
      if (normalizedStudents.length === 0) {
        setIsUploading(false);
        return;
      }

      console.log("Dados Normalizados Prontos para Envio:", normalizedStudents);

      const batchPromises = [];
      // Firestore batch limit is 500 operations
      for (let i = 0; i < normalizedStudents.length; i += 500) {
        const batch = writeBatch(firestore);
        const chunk = normalizedStudents.slice(i, i + 500);
        chunk.forEach(student => {
          if (student.rm) {
            const docRef = doc(firestore, "alunos", student.rm);
            batch.set(docRef, student);
          }
        });
        batchPromises.push(batch.commit());
      }
      
      await Promise.all(batchPromises);
      
      toast({
        title: "Sucesso!",
        description: `${normalizedStudents.length} registros de alunos foram carregados na base de dados.`,
      });
      setDataExists(true);

    } catch (error: any) {
      console.error("Erro ao enviar dados em lote:", error);
      toast({
        variant: "destructive",
        title: "Erro no Upload",
        description: error.message || "Ocorreu um erro ao guardar os dados. Tente novamente.",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const isPageLoading = dataExists === null || isUploading;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-7xl mx-auto">
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
            {dataExists ? "Visualize e filtre os dados dos alunos." : "Carregue o ficheiro de alunos para iniciar a gestão."}
          </p>
        </header>

        <div className="w-full">
          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">{isUploading ? "Aguarde, a processar e carregar os dados..." : "A verificar a base de dados..."}</p>
            </div>
          ) : dataExists ? (
            <StudentDataView />
          ) : (
             <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsUploading} />
          )}
        </div>
      </div>
    </main>
  );
}
