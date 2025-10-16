"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, getDocs, query } from "firebase/firestore";

interface XlsxUploaderProps {
  onUploadComplete: () => void;
}

export default function XlsxUploader({ onUploadComplete }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const processAndSaveFile = async (file: File) => {
    setIsLoading(true);

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro de Conexão',
        description: 'Não foi possível conectar ao banco de dados.',
      });
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
            setIsLoading(false);
            return;
        }

        const headers = json[0].map(h => String(h ?? '').trim());
        const studentNameHeader = "Nome Completo";
        if (!headers.includes(studentNameHeader) && headers.length > 3) {
          headers[3] = studentNameHeader;
        }


        const rows = json.slice(1);

        const processedData = rows.map(row => {
          const rowData: Record<string, string> = {};
          headers.forEach((header, index) => {
            if (!header) return;

            const cellValue = row[index];
            let value = '';

            if (cellValue instanceof Date) {
              // Assuming column with index 11 is a date that needs dd/MM/yyyy format
              if (index === 11) { 
                value = format(cellValue, 'dd/MM/yyyy');
              } else {
                value = cellValue.toISOString();
              }
            } else if (cellValue !== null && cellValue !== undefined) {
              value = String(cellValue);
            }
            
            rowData[header] = value;
          });
          return { data: rowData };
        }).filter(item => item.data[studentNameHeader]);

        if (processedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Nenhum Dado Válido",
            description: `Não foram encontrados dados válidos na coluna "${studentNameHeader}".`,
          });
        } else {
            const batch = writeBatch(firestore);
            const studentsCollection = collection(firestore, "students");
            
            const existingStudentsSnapshot = await getDocs(query(studentsCollection));
            existingStudentsSnapshot.forEach(doc => {
              batch.delete(doc.ref);
            });

            processedData.forEach((student) => {
                const docRef = doc(studentsCollection);
                batch.set(docRef, student);
            });

            await batch.commit();
            
            toast({
                title: "Sucesso!",
                description: `Dados anteriores removidos e ${processedData.length} novos registros foram salvos.`,
            });
            onUploadComplete();
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          variant: "destructive",
          title: "Erro de Processamento",
          description: "Ocorreu um erro ao processar seu arquivo. Verifique o formato e tente novamente.",
        });
      } finally {
        setIsLoading(false);
        if(inputRef.current) {
          inputRef.current.value = "";
        }
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Erro de Leitura",
            description: "Não foi possível ler o arquivo selecionado.",
        });
        setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Tipo de Arquivo Inválido",
        description: "Por favor, envie um arquivo .xlsx ou .csv válido.",
      });
      return;
    }
    processAndSaveFile(file);
  };

  const handleDrag = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [processAndSaveFile]);
  
  const handleClick = () => {
    inputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Limpando dados antigos e salvando o novo arquivo...</p>
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "border-2 border-dashed border-border transition-all duration-200 bg-card",
        isDragging ? "border-primary bg-accent/20" : "hover:border-muted-foreground"
      )}
    >
      <CardContent 
        className="p-6 text-center cursor-pointer" 
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-4 h-52">
          <UploadCloud className="w-16 h-16 text-muted-foreground" />
          <div className="flex flex-col items-center">
            <p className="font-semibold text-foreground">
              <span className="text-primary">Clique para enviar</span> ou arraste e solte
            </p>
            <p className="text-sm text-muted-foreground">
              Arquivos XLSX e CSV
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
