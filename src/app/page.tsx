"use client";

import { useState } from "react";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";

export default function Home() {
  const [data, setData] = useState<DataItem[] | null>(null);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleReset = () => {
    setData(null);
    setColumnHeaders([]);
  };

  const handleUpload = (uploadedData: DataItem[], headers: string[]) => {
    setData(uploadedData);
    setColumnHeaders(headers);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 bg-background">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
            Gestão de Alunos 2025
          </h1>
          <p className="text-muted-foreground mt-2">
            Importe uma planilha para visualizar os dados de forma estruturada.
          </p>
        </header>

        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Processando seu arquivo...</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <DataViewer data={data} columnHeaders={columnHeaders} />
              <Button onClick={handleReset} className="w-full" variant="outline">
                Carregar Outro Arquivo
              </Button>
            </div>
          ) : (
            <XlsxUploader onUpload={handleUpload} setLoading={setIsLoading} />
          )}
        </div>
      </div>
    </main>
  );
}
