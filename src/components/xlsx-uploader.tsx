
"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { useFirestore, commitBatchNonBlocking } from "@/firebase";
import { collection, writeBatch, doc, getDocs } from "firebase/firestore";
import { type DataItem, type SubItem } from "./data-viewer";
import { Button } from "./ui/button";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

interface XlsxUploaderProps {
  onUploadComplete: (data: DataItem[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export default function XlsxUploader({ onUploadComplete, setIsLoading }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const firestore = useFirestore();

  const resetState = () => {
    setFileName(null);
    setFile(null);
    setIsProcessing(false);
    if(inputRef.current) inputRef.current.value = "";
  };

  const processAndSaveFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    setIsLoading(true);

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
      resetState();
      setIsLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler os dados do arquivo.");
        
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json: (string | number | Date | null)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        
        if (json.length < 2) {
            toast({
                variant: "destructive",
                title: "Planilha Inválida",
                description: "A planilha precisa conter um cabeçalho e ao menos uma linha de dados.",
            });
            resetState();
            setIsLoading(false);
            return;
        }

        const headers = json[0].map(h => String(h ?? '').trim().toUpperCase());
        const mainItemHeaderIndex = headers.findIndex(h => h.includes("NOME"));
        
        if (mainItemHeaderIndex === -1) {
          toast({
            variant: "destructive",
            title: "Coluna não encontrada",
            description: "A coluna obrigatória 'NOME' não foi encontrada no arquivo.",
          });
          resetState();
          setIsLoading(false);
          return;
        }

        const rows = json.slice(1);
        const processedData = rows.map((row, rowIndex) => {
          const mainItem = String(row[mainItemHeaderIndex] || '');
          if (!mainItem) return null;

          const subItems: SubItem[] = [];
          const originalHeaders = json[0];

          originalHeaders.forEach((header, index) => {
            const headerStr = String(header ?? '').trim();
            if (!headerStr) return;

            const cellValue = row[index];
            let value = '';

            if (cellValue instanceof Date) {
              value = format(cellValue, 'dd/MM/yyyy');
            } else if (cellValue !== null && cellValue !== undefined) {
              value = String(cellValue);
            }
            
            subItems.push({ label: headerStr, value: value });
          });
          return { id: `temp-${rowIndex}`, mainItem, subItems };
        }).filter(item => item !== null) as DataItem[];

        if (processedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Nenhum Dado Válido",
            description: `Não foram encontrados dados válidos na coluna "NOME".`,
          });
          onUploadComplete([]);
        } else {
            const studentsCollection = collection(firestore, "students");
            const batch = writeBatch(firestore);
            
            const existingDocs = await getDocs(studentsCollection);
            const oldDocsCount = existingDocs.size;
            existingDocs.forEach(doc => batch.delete(doc.ref));

            const dataToUpload = processedData.map(({id, ...rest}) => rest);

            const docRefs: string[] = [];
            dataToUpload.forEach((student) => {
                const docRef = doc(studentsCollection);
                batch.set(docRef, student);
                docRefs.push(docRef.id);
            });
            
            // Use the non-blocking commit which handles permission errors
            commitBatchNonBlocking(batch, studentsCollection.path);

            toast({
                title: "Carregamento Iniciado!",
                description: `${oldDocsCount} registos antigos serão removidos e ${processedData.length} novos registos serão guardados.`,
            });
            
            // The UI will update automatically via the useCollection listener.
            // We just need to signal the upload process is "complete" on the client.
            onUploadComplete([]);
        }
      } catch (error: any) {
        console.error("Error processing file:", error);
        
        // This is a good place for a generic error, but if it's a permission error
        // on getDocs, we should handle it specifically.
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: 'students',
                operation: 'list', // getDocs is a 'list' operation
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({
                variant: "destructive",
                title: "Erro de Processamento",
                description: "Ocorreu um erro ao processar seu arquivo. Verifique o formato e tente novamente.",
            });
        }
        resetState();
      } finally {
        // isLoading is handled by the parent component via onUploadComplete
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Erro de Leitura",
            description: "Não foi possível ler o arquivo selecionado.",
        });
        resetState();
        setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Tipo de Arquivo Inválido",
        description: "Por favor, envie um arquivo .xlsx ou .csv válido.",
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
              <p className="font-semibold text-foreground">Processando arquivo...</p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </>
          ) : fileName ? (
            <>
              <FileCheck2 className="w-16 h-16 text-primary" />
              <p className="font-semibold text-foreground">Arquivo pronto para carregar</p>
              <p className="text-sm text-muted-foreground max-w-full truncate">{fileName}</p>
              <div className="flex gap-2 pt-4">
                <Button variant="secondary" onClick={resetState}>Cancelar</Button>
                <Button onClick={processAndSaveFile}>Confirmar e Salvar</Button>
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
                  Apenas arquivos .xlsx ou .csv
                </p>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
            disabled={isProcessing || !!fileName}
          />
        </div>
      </CardContent>
    </Card>
  );
}
