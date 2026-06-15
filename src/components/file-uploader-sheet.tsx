
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { doc, collection, getDocs, query } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
          if (typeof value === 'number') { // Excel date serial number
            const date = new Date(Date.UTC(0, 0, value - 1));
            if (!isNaN(date.getTime())) {
              processedValue = ('0' + date.getUTCDate()).slice(-2) + '/' + ('0' + (date.getUTCMonth() + 1)).slice(-2) + '/' + date.getUTCFullYear();
            } else {
              processedValue = String(value);
            }
          } else {
             const valStr = String(value).trim();
             // Detect YYYY-MM-DD and convert to DD/MM/YYYY
             if (valStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 const [y, m, d] = valStr.split('-');
                 processedValue = `${d}/${m}/${y}`;
             } else {
                 processedValue = valStr;
             }
          }
        }

        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);
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
  
    try {
        const uploadedRms = new Set(normalizedStudents.map(s => s.rm));
        const studentsColl = collection(firestore, "alunos");
        const snapshot = await getDocs(query(studentsColl));
        
        let moveCount = 0;

        snapshot.docs.forEach(docSnap => {
            const studentId = docSnap.id;
            if (!uploadedRms.has(studentId)) {
                const studentData = docSnap.data();
                const exAlunoRef = doc(firestore, 'exalunos', studentId);
                const studentRef = doc(firestore, 'alunos', studentId);
                
                setDocumentNonBlocking(exAlunoRef, { ...studentData, status: 'TRANSFERIDO' }, { merge: true });
                deleteDocumentNonBlocking(studentRef);
                moveCount++;
            }
        });

        normalizedStudents.forEach(student => {
            if (student.rm) {
                const docId = student.rm;
                const docRef = doc(firestore, "alunos", docId);
                const finalData = { ...student, id: docId, status: "ATIVO" }; 
                setDocumentNonBlocking(docRef, finalData, { merge: true });
            }
        });

        toast({
            title: "Sincronização Iniciada!",
            description: `${normalizedStudents.length} alunos ativos processados. ${moveCount} alunos ausentes foram movidos para 'Transferidos'.`,
        });

        onUploadSuccess();
        setIsOpen(false);
    } catch (error) {
        console.error("Erro na sincronização:", error);
        toast({
            variant: "destructive",
            title: "Erro no Processamento",
            description: "Ocorreu uma falha ao tentar sincronizar os dados."
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (isPrimaryAction) {
    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Upload className="mr-2 h-4 w-4" />
                    Sincronizar Base de Alunos
                </Button>
            </SheetTrigger>
             <SheetContent className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Sincronizar Alunos</SheetTitle>
                <SheetDescription>
                  Envie a listagem master. Alunos ausentes no ficheiro serão movidos para 'Transferidos' automaticamente.
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
          <span>Sincronizar Alunos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Sincronizar Alunos</SheetTitle>
          <SheetDescription>
            Envie a listagem atualizada. O sistema moverá automaticamente os alunos que não constam neste ficheiro para a base de transferidos.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
