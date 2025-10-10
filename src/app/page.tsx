"use client";

import { useState } from "react";
import Image from "next/image";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";

export default function Home() {
  const [showUploader, setShowUploader] = useState(false);
  const firestore = useFirestore();

  const studentsCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "students"));
  }, [firestore]);

  const { data: students, isLoading: isLoadingData, error } = useCollection<DataItem>(studentsCollection);
  
  const handleUploadComplete = () => {
    setShowUploader(false);
  };

  const sortedData = students
    ? [...students].sort((a, b) => (a.mainItem || "").localeCompare(b.mainItem || ""))
    : [];

  const data = sortedData;
  const isLoading = isLoadingData;
  
  const hasData = data && data.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8 flex flex-col items-center">
          <div className="mb-4">
            <Image
              src="/logoyuri.png"
              alt="Logo"
              width={150}
              height={50}
              className="rounded-md"
            />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
            Gestão de Alunos 2025
          </h1>
          <p className="text-muted-foreground mt-2">
            Localize as informações sobre um Aluno matriculado
          </p>
        </header>

        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Carregando dados...</p>
            </div>
          ) : error ? (
            <div className="text-destructive text-center">
              <p>Ocorreu um erro ao carregar os dados.</p>
              <p>{error.message}</p>
            </div>
          )
          : showUploader || !hasData ? (
            <XlsxUploader onUploadComplete={handleUploadComplete} />
          ) : (
            <div className="space-y-4">
              <DataViewer data={data} />
              <Button onClick={() => setShowUploader(true)} className="w-full" variant="outline">
                Carregar Novo Arquivo
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
