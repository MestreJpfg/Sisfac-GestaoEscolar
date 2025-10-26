
"use client";

import { useState } from "react";
import Image from "next/image";
import FileUploader from "@/components/file-uploader";
import { Loader2 } from "lucide-react";
import { quotes } from "@/lib/quotes";
import { useEffect } from "react";

export default function StudentManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [randomQuote, setRandomQuote] = useState<{ quote: string; author: string } | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState('');

  useEffect(() => {
    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    const now = new Date();
    const datePart = now.toLocaleDateString('pt-BR', { dateStyle: 'full' });
    const timePart = now.toLocaleTimeString('pt-BR', { timeStyle: 'short' });
    setCurrentDateTime(`${datePart} - ${timePart}`);
  }, []);

  const handleUploadComplete = (data: any[]) => {
    console.log("Upload complete:", data);
    setIsLoading(false);
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
            Carregue um novo arquivo de dados para começar.
          </p>
        </header>

        <div className="w-full">
          {isPageLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Aguarde, a processar o ficheiro...</p>
            </div>
          ) : (
             <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} />
          )}
        </div>
      </div>
    </main>
  );
}
