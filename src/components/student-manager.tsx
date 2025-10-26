
"use client";

import { useState } from "react";
import Image from "next/image";
import FileUploader from "@/components/file-uploader";
import { Loader2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import { useEffect } from "react";
import { useFirestore, useUser } from "@/firebase";
import { writeBatch, doc } from "firebase/firestore";

export default function StudentManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const now = new Date();
    const datePart = now.toLocaleDateString('pt-BR', { dateStyle: 'full' });
    const timePart = now.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    setCurrentDateTime(`${datePart} - ${timePart}`);
  }, []);

  const normalizeData = (data: any[]): any[] => {
    if (!data || data.length < 2) return [];

    const headers: string[] = data[0].map((header: any) => 
      String(header).trim().toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    );
    
    const rmIndex = headers.indexOf('rm');
    if (rmIndex === -1) {
      console.error("A coluna 'RM' é obrigatória e não foi encontrada.");
      // You might want to show a toast message to the user here
      return [];
    }

    return data.slice(1).map(row => {
      const student: any = {};
      row.forEach((value: any, index: number) => {
        const header = headers[index];
        if (!header) return;

        let processedValue = value;

        if (String(value).trim().toUpperCase() === "SIM") {
          processedValue = true;
        } else if (String(value).trim().toUpperCase() === "NÃO" || String(value).trim().toUpperCase() === "NAO") {
          processedValue = false;
        } else if (value === null || String(value).trim() === '') {
          processedValue = null;
        }

        if (header === 'telefones') {
          processedValue = String(value).split(/[,;]/).map(phone => phone.trim()).filter(p => p);
        }

        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);

      return student;
    }).filter(Boolean); // Filtra quaisquer linhas que resultaram em nulo
  };

  const handleUploadComplete = async (data: any[]) => {
    if (!firestore || !user) {
      console.error("Firestore or user not available.");
      return;
    }

    setIsLoading(true);
    setIsUploading(true);

    const normalizedStudents = normalizeData(data);
    
    if (normalizedStudents.length === 0) {
      setIsLoading(false);
      setIsUploading(false);
      return;
    }

    console.log("Dados Normalizados Prontos para Envio:", normalizedStudents);

    const batch = writeBatch(firestore);
    normalizedStudents.forEach(student => {
      if (student.rm) {
        const docRef = doc(firestore, "alunos", student.rm);
        batch.set(docRef, student);
      }
    });

    try {
      await batch.commit();
      console.log("Upload em lote concluído com sucesso!");
      // Optionally, show a success toast to the user
    } catch (error) {
      console.error("Erro ao enviar dados em lote:", error);
      // Optionally, show an error toast to the user
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };
  
  const isPageLoading = isLoading;

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
            Carregue o ficheiro de alunos para iniciar a gestão.
          </p>
        </header>

        <div className="w-full">
          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Aguarde, a processar e carregar os dados...</p>
            </div>
          ) : (
             <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsUploading} />
          )}
        </div>

        {/* The data viewer and other components will be added here in the future */}

      </div>
    </main>
  );
}
