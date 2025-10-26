"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import FileUploader from "@/components/file-uploader";
import { Loader2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import { useFirestore } from "@/firebase";
import { writeBatch, doc, getCountFromServer, collection } from "firebase/firestore";
import StudentDataView from "./student-data-view";
import { useToast } from "@/hooks/use-toast";

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

  const checkDataExists = useCallback(async () => {
    if (!firestore) return;
    try {
      const collectionRef = collection(firestore, 'alunos');
      const snapshot = await getCountFromServer(collectionRef);
      const exists = snapshot.data().count > 0;
      setDataExists(exists);
    } catch (error) {
      console.error("Error checking for existing data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao verificar dados",
        description: "Não foi possível comunicar com a base de dados para verificar os dados existentes.",
      });
      setDataExists(false); // Assume no data if check fails
    }
  }, [firestore, toast]);

  useEffect(() => {
    if (firestore) {
      checkDataExists();
    }
  }, [firestore, checkDataExists]);


  const normalizeData = (data: any[]): any[] => {
    if (!data || data.length < 2) return [];

    const headers: string[] = data[0].map((header: any) => {
        let h = String(header).trim().toLowerCase()
          .replace(/ç/g, 'c')
          .replace(/ã/g, 'a')
          .replace(/é/g, 'e')
          .replace(/º/g, '')
          .replace(/\./g, '')
          .replace(/\s+/g, '_');
          
        if (h === 'nome_do_registro_civil' || h === 'nome_registro_civil' || h === 'nome_de_registro_civil') {
            return 'nome';
        }
        if (h === 'filiacao_1' || h === 'filiação_1') {
            return 'filiacao_1';
        }
         if (h === 'filiacao_2' || h === 'filiação_2') {
            return 'filiacao_2';
        }
        return h;
    });
    
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
        if (typeof value === 'string') {
           const stringValue = value.trim().toUpperCase();
            if (stringValue === "SIM") {
              processedValue = true;
            } else if (stringValue === "NÃO" || stringValue === "NAO") {
              processedValue = false;
            } else {
              processedValue = value;
            }
        }
        
        if (value === null || String(value).trim() === '') {
          processedValue = null;
        }

        if (header === 'telefones' && value) {
          processedValue = String(value).split(/[,;/]/).map(phone => phone.trim()).filter(p => p);
        }
        
        if (header === 'data_nascimento' && value) {
          if (typeof value === 'number') {
            // Excel date to JS date
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) {
              processedValue = ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear();
            } else {
              processedValue = String(value); // Keep original if parse fails
            }
          } else {
             processedValue = String(value);
          }
        }

        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);

      return student;
    }).filter(Boolean);
  };

  const handleUploadComplete = async (data: any[]) => {
    // O FirebaseProvider agora garante que `firestore` está disponível antes de renderizar este componente.
    setIsUploading(true);
  
    try {
      const normalizedStudents = normalizeData(data);
      
      if (normalizedStudents.length === 0) {
        setIsUploading(false);
        return;
      }
  
      const batchPromises = [];
      const batch = writeBatch(firestore);
      for (let i = 0; i < normalizedStudents.length; i += 500) {
        const chunk = normalizedStudents.slice(i, i + 500);
        chunk.forEach(student => {
          if (student.rm) {
            const docRef = doc(firestore, "alunos", student.rm);
            batch.set(docRef, student, { merge: true });
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
        description: error.message || "Ocorreu um erro ao guardar os dados. Verifique a sua conexão e as permissões da base de dados.",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const isPageLoading = dataExists === null;

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
            {dataExists ? "Visualize os dados dos alunos." : "Carregue o ficheiro de alunos para iniciar a gestão."}
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
             <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsUploading} />
          )}
        </div>
      </div>
    </main>
  );
}
