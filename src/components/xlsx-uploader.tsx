"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { type DataItem } from "./data-viewer";
import { format } from 'date-fns';

interface XlsxUploaderProps {
  onUpload: (data: DataItem[], headers: string[]) => void;
  setLoading: (loading: boolean) => void;
}

export default function XlsxUploader({ onUpload, setLoading }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file) {
      return;
    }

    if (!file.name.endsWith('.xlsx')) {
      toast({
        variant: "destructive",
        title: "Tipo de Arquivo Inválido",
        description: "Por favor, envie um arquivo .xlsx válido.",
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
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
            setLoading(false);
            return;
        }

        const headers = json[0].map(h => String(h));
        const rows = json.slice(1);

        const processedData: DataItem[] = rows.map(row => {
          const mainItem = String(row[3] || ''); // 4th column
          const subItems = row
            .map((cell, index) => {
              if (index === 3) return null;
              
              let value = '';
              if (cell instanceof Date) {
                  if (index === 11) { // 12th column
                      value = format(cell, 'dd/MM/yyyy');
                  } else {
                      value = cell.toISOString();
                  }
              } else {
                  value = String(cell || '');
              }

              return {
                label: headers[index] || `Coluna ${index + 1}`,
                value: value,
              };
            })
            .filter((item): item is { label: string; value: string } => item !== null);
          
          const allColumns = row.map((cell, index) => {
            if (index === 11 && cell instanceof Date) {
              return format(cell, 'dd/MM/yyyy');
            }
            return String(cell || '');
          });

          return {
            mainItem,
            subItems,
            allColumns: allColumns
          };
        }).filter(item => item.mainItem);

        if (processedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Nenhum Dado Encontrado",
            description: "Não foram encontrados dados válidos na 4ª coluna para exibir.",
          });
        } else {
          onUpload(processedData, headers);
        }
      } catch (error) {
        console.error(error);
        toast({
          variant: "destructive",
          title: "Erro de Processamento",
          description: "Ocorreu um erro ao processar seu arquivo. Ele pode estar corrompido.",
        });
      } finally {
        setLoading(false);
      }
    };
    
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "Erro de Leitura de Arquivo",
            description: "Não foi possível ler o arquivo selecionado.",
        });
        setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  }, [onUpload, setLoading, toast]);

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
              Apenas arquivos XLSX
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
        </div>
      </CardContent>
    </Card>
  );
}
