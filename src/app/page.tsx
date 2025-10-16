"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import XlsxUploader from "@/components/xlsx-uploader";
import DataViewer from "@/components/data-viewer";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { type DataItem } from "@/components/data-viewer";
import { useFirestore } from "@/firebase";
import { collection, getDocs, query, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function Home() {
  const [data, setData] = useState<DataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const studentsCollection = collection(firestore, "students");
      const q = query(studentsCollection);
      const querySnapshot = await getDocs(q);
      const studentsData: DataItem[] = [];
      querySnapshot.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() } as DataItem);
      });
      
      // Sort data alphabetically by student name
      studentsData.sort((a, b) => (a.data['Nome Completo'] || "").localeCompare(a.data['Nome Completo'] || ""));

      setData(studentsData);
    } catch (err: any) {
      console.error("Error fetching data: ", err);
      setError(err);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível buscar as informações dos alunos.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [firestore]);


  const handleUploadComplete = () => {
    fetchData();
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
  
    setIsLoading(true);
    try {
      // 1. Fetch all documents
      const studentsCollection = collection(firestore, "students");
      const q = query(studentsCollection);
      const querySnapshot = await getDocs(q);
      
      // 2. Delete all documents in a batch
      if (!querySnapshot.empty) {
        const batch = writeBatch(firestore);
        querySnapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
  
      // 3. Clear local state
      setData([]);
      
      toast({
        title: "Dados removidos",
        description: "Os dados anteriores foram limpos. Você já pode carregar um novo arquivo.",
      });

    } catch (err) {
      console.error("Error clearing data:", err);
      toast({
        variant: "destructive",
        title: "Erro ao limpar dados",
        description: "Não foi possível remover os dados existentes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasData = data && data.length > 0;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background">
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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary font-headline">
            Gestão de Alunos 2025
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
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
  );
}
