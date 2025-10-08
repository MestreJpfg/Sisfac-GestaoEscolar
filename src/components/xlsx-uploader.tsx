"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DataItem } from "./data-viewer";
import { format } from 'date-fns';
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";

interface XlsxUploaderProps {
  onUploadComplete: () => void;
}

function toFraction(decimal: number) {
    if (decimal === 0) return "0";
    if (decimal === 1) return "1";

    let bestNumerator = 1;
    let bestDenominator = 1;
    let minError = Math.abs(decimal - 1);

    for (let denominator = 1; denominator <= 100; denominator++) {
        const numerator = Math.round(decimal * denominator);
        if (numerator === 0) continue;
        const error = Math.abs(decimal - numerator / denominator);
        if (error < minError) {
            minError = error;
            bestNumerator = numerator;
            bestDenominator = denominator;
        }
    }
    return `${bestNumerator}/${bestDenominator}`;
}

export default function XlsxUploader({ onUploadComplete }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.csv')) {
      toast({
        variant: "destructive",
        title: "Tipo de Arquivo Inválido",
        description: "Por favor, envie um arquivo .xlsx ou .csv válido.",
      });
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler os dados do arquivo.");
        
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const json: (string | number | Date)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length < 1) {
            toast({
                variant: "destructive",
                title: "Planilha Vazia",
                description: "Sua planilha parece estar vazia.",
            });
            setIsLoading(false);
            return;
        }

        const headers = json[0].map(h => String(h));
        const rows = json.slice(1);

        const processedData: Omit<DataItem, 'id'>[] = rows.map(row => {
          const mainItem = String(row[3] || '000'); // 4th column
          const subItems = row
            .map((cell, index) => {
              if (index === 3) return null;
              
              let value = '';
              if (index === 8) { // 9th column for fraction
                const num = Number(cell);
                if (!isNaN(num)) {
                    value = toFraction(num);
                } else {
                    value = String(cell || '000');
                }
              } else if (cell instanceof Date) {
                  if (index === 11) { // 12th column
                      value = format(cell, 'dd/MM/yyyy');
                  } else {
                      value = cell.toISOString();
                  }
              } else {
                  value = String(cell || '000');
              }

              return {
                label: headers[index] || `Coluna ${index + 1}`,
                value: value,
              };
            })
            .filter((item): item is { label: string; value: string } => item !== null);
          
          const allColumns = row.map((cell, index) => {
            if (index === 8) { // 9th column
              const num = Number(cell);
              if (!isNaN(num)) {
                  return toFraction(num);
              }
              return String(cell || '000');
            }
            if (index === 11 && cell instanceof Date) {
              return format(cell, 'dd/MM/yyyy');
            }
            return String(cell || '000');
          });

          return {
            mainItem,
            subItems,
            allColumns
          };
        }).filter(item => item.mainItem);

        if (processedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Nenhum Dado Encontrado",
            description: "Não foram encontrados dados válidos na 4ª coluna para exibir.",
          });
        } else {
            if (firestore) {
                const batch = writeBatch(firestore);
                const studentsCollection = collection(firestore, "students");
                processedData.forEach((studentData) => {
                    const docRef = doc(studentsCollection);
                    batch.set(docRef, studentData);
                });
                await batch.commit();
                toast({
                    title: "Sucesso!",
                    description: "Os dados da planilha foram salvos no banco de dados.",
                });
                onUploadComplete();
            }
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Erro de Processamento",
          description: "Ocorreu um erro ao processar seu arquivo. Ele pode estar corrompido.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Erro de Leitura de Arquivo",
            description: "Não foi possível ler o arquivo selecionado.",
        });
        setIsLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [onUploadComplete, toast, firestore]);

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
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);
  
  const handleClick = () => {
    inputRef.current?.click();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Processando e salvando seu arquivo...</p>
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
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
