
"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { useFirestore } from "@/firebase";
import { collection, writeBatch, doc, getDocs, query } from "firebase/firestore";
import { type DataItem, type SubItem } from "./data-viewer";

interface XlsxUploaderProps {
  onUploadComplete: (data: DataItem[]) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export default function XlsxUploader({ onUploadComplete, setIsLoading }: XlsxUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
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

        const headers = json[0].map(h => String(h ?? '').trim().toUpperCase());
        const mainItemHeaderIndex = headers.findIndex(h => h.includes("NOME"));
        
        if (mainItemHeaderIndex === -1) {
          toast({
            variant: "destructive",
            title: "Coluna não encontrada",
            description: "A coluna obrigatória 'NOME' não foi encontrada no arquivo.",
          });
          setIsLoading(false);
          return;
        }

        const rows = json.slice(1);

        const processedData = rows.map((row, rowIndex) => {
          const mainItem = String(row[mainItemHeaderIndex] || '');
          if (!mainItem) {
            return null; // Ignora linhas sem nome de aluno
          }

          const subItems: SubItem[] = [];
          const originalHeaders = json[0]; // Mantém os cabeçalhos originais para os labels

          originalHeaders.forEach((header, index) => {
            const headerStr = String(header ?? '').trim();
            if (!headerStr) return;

            const cellValue = row[index];
            let value = '';

            if (cellValue instanceof Date) {
              // Sempre formata a data para dd/MM/yyyy
              value = format(cellValue, 'dd/MM/yyyy');
            } else if (cellValue !== null && cellValue !== undefined) {
              value = String(cellValue);
            }
            
            subItems.push({ label: headerStr, value: value });
          });
          // A ID será gerada pelo firestore, mas precisamos de uma para a UI antes do refresh
          return { id: `temp-${rowIndex}`, mainItem, subItems };
        }).filter(item => item !== null) as DataItem[];

        if (processedData.length === 0) {
          toast({
            variant: "destructive",
            title: "Nenhum Dado Válido",
            description: `Não foram encontrados dados válidos na coluna "NOME".`,
          });
          onUploadComplete([]); // Pass empty array to clear view
        } else {
            const studentsCollection = collection(firestore, "students");
            const batch = writeBatch(firestore);
            
            const existingDocs = await getDocs(query(studentsCollection));
            existingDocs.forEach(doc => batch.delete(doc.ref));

            const dataToUpload = processedData.map(({id, ...rest}) => rest);

            const docRefs: string[] = [];
            dataToUpload.forEach((student) => {
                const docRef = doc(studentsCollection);
                batch.set(docRef, student);
                docRefs.push(docRef.id);
            });

            await batch.commit();

            toast({
                title: "Sucesso!",
                description: `Dados anteriores removidos e ${processedData.length} novos registros foram salvos.`,
            });
            
            // Reconstruct data with real IDs
            const newData = processedData.map((item, index) => ({
              ...item,
              id: docRefs[index]
            }));

            onUploadComplete(newData);
        }
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
            variant: "destructive",
            title: "Erro de Processamento",
            description: "Ocorreu um erro ao processar seu arquivo. Verifique as permissões do Firestore e o formato do arquivo.",
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
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
