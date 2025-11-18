
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { doc, writeBatch } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { commitBatchNonBlocking } from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import FileUploader from "./file-uploader";
import { Upload } from "lucide-react";

interface FileUploaderSheetProps {
  onUploadSuccess: () => void;
  isPrimaryAction?: boolean;
}

export default function FileUploaderSheet({ onUploadSuccess, isPrimaryAction = false }: FileUploaderSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const normalizeData = (data: any[]): any[] => {
    if (!data || data.length < 2) return [];

    const headers: string[] = data[0].map((header: any) => {
        let h = String(header).trim().toLowerCase()
          .replace(/ç/g, 'c')
          .replace(/ã/g, 'a')
          .replace(/é/g, 'e')
          .replace(/º/g, '')
          .replace(/\./g, '')
          .replace(/\s+/g, '_');
          
        if (h === 'nome_do_registro_civil' || h === 'nome_registro_civil' || h === 'nome_de_registro_civil') {
            return 'nome';
        }
        if (h === 'filiacao_1' || h === 'filiação_1') {
            return 'filiacao_1';
        }
         if (h === 'filiacao_2' || h === 'filiação_2') {
            return 'filiacao_2';
        }
        if (h === 'telefone') {
            return 'telefones';
        }
        return h;
    });
    
    const rmIndex = headers.indexOf('rm');
    if (rmIndex === -1) {
      toast({
        variant: "destructive",
        title: "Coluna 'RM' não encontrada",
        description: "A planilha precisa ter uma coluna 'RM' para identificar cada aluno.",
      });
      return [];
    }

    return data.slice(1).map(row => {
      const student: any = {};
      row.forEach((value: any, index: number) => {
        const header = headers[index];
        if (!header) return;

        let processedValue = value;
        if (typeof value === 'string') {
           const stringValue = value.trim().toUpperCase();
            if (stringValue === "SIM") {
              processedValue = true;
            } else if (stringValue === "NÃO" || stringValue === "NAO") {
              processedValue = false;
            } else {
              processedValue = value;
            }
        }
        
        if (value === null || String(value).trim() === '') {
          processedValue = null;
        }

        if (header === 'telefones' && value) {
            processedValue = String(value)
                .split(/[,;/]/)
                .map(phone => phone.replace(/\D/g, ''))
                .filter(p => p && p.length >= 10);
        }
        
        if (header === 'data_nascimento' && value) {
          if (typeof value === 'number') {
            const date = new Date(Math.round((value - 25569) * 86400 * 1000));
            if (!isNaN(date.getTime())) {
              processedValue = ('0' + date.getDate()).slice(-2) + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + date.getFullYear();
            } else {
              processedValue = String(value);
            }
          } else {
             processedValue = String(value);
          }
        }

        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);
      student.status = "ATIVO"; // Default status for uploaded students

      return student;
    }).filter(Boolean);
  };

  const handleUploadComplete = async (data: any[]) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Erro de Conexão",
        description: "A conexão com a base de dados ainda não foi estabelecida."
      });
      return;
    }
  
    setIsLoading(true);
  
    const normalizedStudents = normalizeData(data);
    
    if (normalizedStudents.length === 0) {
      setIsLoading(false);
      return;
    }
  
    const alunosCollectionPath = "alunos";
    const batch = writeBatch(firestore);
    
    normalizedStudents.forEach(student => {
      if (student.rm) {
        const docRef = doc(firestore, alunosCollectionPath, student.rm);
        batch.set(docRef, student, { merge: true });
      }
    });
  
    commitBatchNonBlocking(batch, alunosCollectionPath);

    setTimeout(() => {
        toast({
            title: "Sucesso!",
            description: `${normalizedStudents.length} registros de alunos foram carregados na base de dados.`,
        });
        onUploadSuccess();
        setIsOpen(false);
        setIsLoading(false);
    }, 1500);
  };

  if (isPrimaryAction) {
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Carregar Dados dos Alunos
                </Button>
            </SheetTrigger>
             <SheetContent className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Carregar Alunos</SheetTitle>
                <SheetDescription>
                  Envie um ficheiro XLSX, CSV ou JSON para adicionar ou atualizar os dados dos alunos.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 flex-1">
                <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
              </div>
            </SheetContent>
        </Sheet>
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="flex items-center gap-2 shadow-lg">
          <Upload className="h-4 w-4" />
          <span>Carregar Alunos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Carregar Alunos</SheetTitle>
          <SheetDescription>
            Envie um ficheiro XLSX, CSV ou JSON para adicionar ou atualizar os dados dos alunos.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
