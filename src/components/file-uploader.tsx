
"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface FileUploaderProps {
  onUploadComplete: (data: any[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export default function FileUploader({ onUploadComplete, setIsLoading }: FileUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const resetState = () => {
    setFileName(null);
    setFile(null);
    setIsProcessing(false);
    if(inputRef.current) inputRef.current.value = "";
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setIsLoading(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler os dados do arquivo.");
        
        let jsonData: any[] = [];

        if (file.name.endsWith('.json')) {
          jsonData = JSON.parse(data as string);
        } else if (file.name.endsWith('.csv')) {
            const workbook = XLSX.read(data, { type: 'string' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else if (file.name.endsWith('.xlsx')) {
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
            throw new Error("Formato de ficheiro não suportado.");
        }

        if (jsonData.length === 0) {
          toast({
            variant: "destructive",
            title: "Ficheiro Vazio",
            description: "O ficheiro selecionado não contém dados.",
          });
        } else {
          toast({
            title: "Ficheiro Processado!",
            description: `${jsonData.length} registos foram lidos de ${file.name}.`,
          });
          onUploadComplete(jsonData);
        }

      } catch (error: any) {
        console.error("Error processing file:", error);
        toast({
          variant: "destructive",
          title: "Erro de Processamento",
          description: "Ocorreu um erro ao processar seu ficheiro. Verifique o formato e tente novamente.",
        });
      } finally {
        setIsLoading(false);
        setIsProcessing(false);
        // We can decide if we want to reset the state or show the file as processed
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
        setIsLoading(false);
    };

    if (file.type === 'application/json') {
      reader.readAsText(file);
    } else if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    }
    else {
      reader.readAsArrayBuffer(file);
    }
  }

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const allowedExtensions = ['.xlsx', '.csv', '.json'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Tipo de Ficheiro Inválido",
        description: "Por favor, envie um ficheiro .xlsx, .csv ou .json válido.",
      });
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile.name);
  };

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing || fileName) return;
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, [isProcessing, fileName]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing || fileName) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [isProcessing, fileName]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const handleClick = () => {
    if (isProcessing || fileName) return;
    inputRef.current?.click();
  };

  return (
    <Card 
      className={cn(
        "border-2 border-dashed transition-all duration-300",
        isDragging ? "border-primary bg-primary/10 shadow-2xl" : "border-border",
        fileName && !isProcessing ? "border-primary bg-primary/5" : ""
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
          
          {isProcessing ? (
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
                  Ficheiros XLSX, CSV, ou JSON
                </p>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
            disabled={isProcessing || !!fileName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
