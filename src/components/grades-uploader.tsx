
"use client";

import { useRef, useState, useCallback, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, FileCheck2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useFirestore } from "@/firebase";
import { writeBatch, doc, getDoc, collection } from "firebase/firestore";
import { commitBatchNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";

export default function GradesUploader() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<string>("");

  const resetState = () => {
    setFileName(null);
    setFile(null);
    setEtapa("");
    setIsProcessing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const processFile = async () => {
    if (!file || !etapa) {
      toast({
        variant: "destructive",
        title: "Informação em falta",
        description: "Por favor, selecione um ficheiro e a etapa correspondente.",
      });
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler os dados do arquivo.");

        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          throw new Error("A planilha de notas está vazia ou tem apenas cabeçalhos.");
        }
        
        await updateGradesInFirestore(jsonData);

      } catch (error: any) {
        console.error("Error processing grades file:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Processar Notas",
          description: error.message || "Ocorreu um erro ao processar o seu ficheiro de notas. Verifique o formato e tente novamente.",
        });
      } finally {
        setIsProcessing(false);
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
        setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const updateGradesInFirestore = async (data: any[][]) => {
    if (!firestore) return;

    const headers: string[] = data[0].map((header: any) => 
        String(header).trim().toLowerCase()
          .replace(/ç/g, 'c')
          .replace(/ã/g, 'a')
          .replace(/é/g, 'e')
          .replace(/º/g, '')
          .replace(/\./g, '')
          .replace(/\s+/g, '_')
    );
    const rmIndex = headers.findIndex(h => h === 'matricula' || h === 'rm');
    const nameIndex = headers.findIndex(h => h === 'nome' || h === 'nome_do_aluno');

    if (rmIndex === -1) {
        throw new Error("A coluna 'Matrícula' ou 'RM' é obrigatória na planilha de notas.");
    }

    const gradesData = data.slice(1);
    const batch = writeBatch(firestore);
    const alunosCollectionRef = collection(firestore, 'alunos');
    let updatedCount = 0;
    let createdCount = 0;

    for (const row of gradesData) {
        const rm = String(row[rmIndex]);
        if (!rm) continue;

        const studentDocRef = doc(alunosCollectionRef, rm);
        const studentDocSnap = await getDoc(studentDocRef);

        const gradeUpdate: { [key: string]: any } = {};

        headers.forEach((header, index) => {
            if (index === rmIndex || index === nameIndex) return;

            const subject = header.replace(/\s+/g, '_').toLowerCase();
            const gradeValue = row[index];
            
            let grade: number | null = null;
            if (gradeValue !== null && gradeValue !== undefined && String(gradeValue).trim() !== '') {
                const numericGrade = Number(String(gradeValue).replace(',', '.'));
                if (!isNaN(numericGrade)) {
                    grade = numericGrade;
                }
            }
            
            gradeUpdate[`boletim.${subject}.${etapa}`] = grade;
        });
        
        if (studentDocSnap.exists()) {
            batch.update(studentDocRef, gradeUpdate);
            updatedCount++;
        } else {
            const studentName = nameIndex !== -1 ? row[nameIndex] : `Aluno ${rm}`;
            const newStudentData: any = {
                rm: rm,
                nome: studentName || `Aluno ${rm}`,
                status: 'NÃO LISTADO',
                boletim: {}
            };

            headers.forEach((header, index) => {
              if (index === rmIndex || index === nameIndex) return;
              const subject = header.replace(/\s+/g, '_').toLowerCase();
              const gradeValue = row[index];
              let grade: number | null = null;
              if (gradeValue !== null && gradeValue !== undefined && String(gradeValue).trim() !== '') {
                  const numericGrade = Number(String(gradeValue).replace(',', '.'));
                  if (!isNaN(numericGrade)) {
                      grade = numericGrade;
                  }
              }

              if (!newStudentData.boletim[subject]) {
                  newStudentData.boletim[subject] = {};
              }
              newStudentData.boletim[subject][etapa] = grade;
            });
            batch.set(studentDocRef, newStudentData);
            createdCount++;
        }
    }

    commitBatchNonBlocking(batch, 'alunos');

    toast({
        title: "Processamento Concluído!",
        description: `${updatedCount} alunos atualizados e ${createdCount} novos alunos adicionados com o status "Não Listado".`,
    });
  };

  const handleFileSelect = (selectedFile: File | null) => {
    if (!selectedFile) return;

    const allowedExtensions = ['.xlsx'];
    const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      toast({
        variant: "destructive",
        title: "Tipo de Ficheiro Inválido",
        description: "Por favor, envie um ficheiro .xlsx válido.",
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
  }, [isProcessing, fileName]);

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
        <div className="flex flex-col items-center justify-center space-y-4 h-96 sm:h-96">
          
          {isProcessing ? (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <p className="font-semibold text-foreground">A processar as notas...</p>
              <p className="text-sm text-muted-foreground">{fileName}</p>
            </>
          ) : fileName ? (
            <>
              <FileCheck2 className="w-16 h-16 text-primary" />
              <p className="font-semibold text-foreground">Ficheiro de notas pronto</p>
              <p className="text-sm text-muted-foreground max-w-full truncate">{fileName}</p>
              
              <div className="space-y-4 py-4 w-full max-w-xs">
                <Label htmlFor="etapa-select">Selecione a Etapa das Notas</Label>
                <Select value={etapa} onValueChange={setEtapa}>
                    <SelectTrigger id="etapa-select">
                        <SelectValue placeholder="Selecione a etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="etapa1">Etapa 1</SelectItem>
                        <SelectItem value="etapa2">Etapa 2</SelectItem>
                        <SelectItem value="etapa3">Etapa 3</SelectItem>
                        <SelectItem value="etapa4">Etapa 4</SelectItem>
                    </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="secondary" onClick={resetState}>Cancelar</Button>
                <Button onClick={processFile} disabled={!etapa}>Confirmar e Carregar Notas</Button>
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
                  Ficheiro de Notas em formato .XLSX
                </p>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files ? e.target.files[0] : null)}
            disabled={isProcessing || !!fileName}
          />
        </div>
      </CardContent>
    </Card>
  );
}

    