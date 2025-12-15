
"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useFirestore } from "@/firebase";
import { writeBatch, doc } from "firebase/firestore";
import { commitBatchNonBlocking } from "@/firebase/non-blocking-updates";

interface ExAlunoUploaderProps {
  onUploadComplete: (count: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}

const normalizeHeader = (header: any): string => {
    if (typeof header !== 'string') return '';
    return header.trim().toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ã/g, 'a')
        .replace(/é/g, 'e')
        .replace(/º/g, '')
        .replace(/\./g, '')
        .replace(/\s+/g, '_');
};

export default function ExAlunoUploader({ onUploadComplete, setIsLoading, isLoading }: ExAlunoUploaderProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const resetState = () => {
    setFileName(null);
    setFile(null);
    setIsLoading(false);
    if(inputRef.current) inputRef.current.value = "";
  };

  const uploadToFirestore = (data: any[]) => {
    if (!firestore) {
        throw new Error("Conexão com a base de dados não estabelecida.");
    }
    const batch = writeBatch(firestore);
    let count = 0;

    const headers: string[] = data[0].map(normalizeHeader);
    const possibleRmHeaders = ['rm', 'matricula', 'registro_do_aluno'];
    const rmIndex = headers.findIndex(h => possibleRmHeaders.includes(h));


    if (rmIndex === -1) {
        throw new Error("Coluna 'RM', 'Matricula' ou 'Registro do Aluno' não encontrada.");
    }

    data.slice(1).forEach(row => {
        const rm = row[rmIndex];
        if (rm) {
            const docRef = doc(firestore, 'exalunos', String(rm));
            const studentData: { [key: string]: any } = { id: String(rm) };
            headers.forEach((header, index) => {
                if (!header) return;
                studentData[header] = row[index];
            });
            batch.set(docRef, studentData, { merge: true });
            count++;
        }
    });

    if (count === 0) {
        throw new Error("Nenhum registo válido com RM encontrado no ficheiro.");
    }
    
    commitBatchNonBlocking(batch, 'exalunos');
    return count;
  };

  const processFile = async () => {
    if (!file) return;

    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler os dados do arquivo.");
        
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          throw new Error("O ficheiro está vazio ou contém apenas cabeçalhos.");
        }
        
        const uploadedCount = uploadToFirestore(jsonData);

        toast({
          title: "Carregamento em Progresso...",
          description: `${uploadedCount} registos de ex-alunos estão a ser enviados.`,
        });
        onUploadComplete(uploadedCount);

      } catch (error: any) {
        console.error("Error processing file:", error);
        toast({
          variant: "destructive",
          title: "Erro de Processamento",
          description: error.message || "Ocorreu um erro ao processar o ficheiro.",
        });
      } finally {
        resetState();
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Erro de Leitura",
            description: "Não foi possível ler o ficheiro selecionado.",
        });
        resetState();
    };

    reader.readAsArrayBuffer(file);
  }

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const allowedExtensions = ['.xlsx', '.csv'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Tipo de Ficheiro Inválido",
        description: "Por favor, envie um ficheiro .xlsx ou .csv válido.",
      });
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, [isLoading]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [isLoading]);
  
  const handleClick = () => {
    if (isLoading) return;
    inputRef.current?.click();
  };

  return (
    <Card 
      className={cn(
        "border-2 border-dashed transition-all duration-300",
        isDragging ? "border-primary bg-primary/10 shadow-2xl" : "border-border",
        fileName && !isLoading ? "border-primary bg-primary/5" : ""
      )}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <CardContent 
        className="p-6 text-center" 
      >
        <div className="flex flex-col items-center justify-center space-y-4 h-64 sm:h-80">
          
          {isLoading ? (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-semibold text-foreground">A processar o ficheiro...</p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </>
          ) : fileName ? (
            <>
              <FileCheck2 className="w-16 h-16 text-primary" />
              <p className="font-semibold text-foreground">Ficheiro pronto para carregar</p>
              <p className="text-sm text-muted-foreground max-w-full truncate">{fileName}</p>
              <div className="flex gap-2 pt-4">
                <Button variant="secondary" onClick={resetState}>Cancelar</Button>
                <Button onClick={processFile}>Confirmar e Carregar</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4 cursor-pointer" onClick={handleClick}>
              <UploadCloud className={cn("w-16 h-16 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
              <div className="flex flex-col items-center">
                <p className="font-semibold text-foreground">
                  <span className={cn("transition-colors", isDragging ? "text-primary" : "text-primary/80")}>Clique para enviar</span> ou arraste e solte
                </p>
                <p className="text-sm text-muted-foreground">
                  Ficheiros XLSX ou CSV
                </p>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
            disabled={isLoading}
          />
        </div>
      </CardContent>
    </Card>
  );
}
