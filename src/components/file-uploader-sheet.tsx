"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { doc, collection, getDocs } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
import { Upload, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
        
        // Normalização Rigorosa de Data de Nascimento (DD/MM/AAAA)
        if (header === 'data_nascimento' && value) {
          if (typeof value === 'number') { 
            // Caso seja número serial do Excel
            const date = new Date(Date.UTC(0, 0, value - 1));
            if (!isNaN(date.getTime())) {
              processedValue = ('0' + date.getUTCDate()).slice(-2) + '/' + ('0' + (date.getUTCMonth() + 1)).slice(-2) + '/' + date.getUTCFullYear();
            } else {
              processedValue = String(value);
            }
          } else if (value instanceof Date) {
            // Caso venha como objeto Date do JavaScript (com cellDates: true)
            if (!isNaN(value.getTime())) {
               processedValue = ('0' + value.getUTCDate()).slice(-2) + '/' + ('0' + (value.getUTCMonth() + 1)).slice(-2) + '/' + value.getUTCFullYear();
            }
          } else {
             const valStr = String(value).trim();
             // Deteta formato ISO AAAA-MM-DD
             if (valStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 const [y, m, d] = valStr.split('-');
                 processedValue = `${d}/${m}/${y}`;
             } 
             // Deteta formato ISO com tempo AAAA-MM-DDTHH...
             else if (valStr.match(/^\d{4}-\d{2}-\d{2}T.*$/)) {
                 const [y, m, d] = valStr.split('T')[0].split('-');
                 processedValue = `${d}/${m}/${y}`;
             }
             // Se for string qualquer, tentamos manter o que está lá, presumindo que o usuário enviou DD/MM/AAAA
             else {
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

  const generateSummaryReport = (inclusions: any[], changes: any[]) => {
    const doc = new jsPDF();
    const timestamp = format(new Date(), "dd/MM/yyyy HH:mm");

    doc.setFontSize(16);
    doc.text("Relatório de Alterações na Base de Alunos", 14, 15);
    doc.setFontSize(10);
    doc.text(`Data do Processamento: ${timestamp}`, 14, 22);

    let currentY = 30;

    // Seção de Inclusões
    if (inclusions.length > 0) {
        doc.setFontSize(12);
        doc.text(`Novos Alunos Incluídos (${inclusions.length})`, 14, currentY);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['RM', 'Nome', 'Série', 'Turma', 'Turno']],
            body: inclusions.map(s => [s.rm, s.nome, s.serie, s.classe, s.turno]),
            theme: 'striped',
            headStyles: { fillColor: [46, 125, 50] },
            styles: { fontSize: 8 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    } else {
        doc.setFontSize(12);
        doc.text("Nenhum novo aluno incluído.", 14, currentY);
        currentY += 15;
    }

    // Seção de Mudanças de Enturmação
    if (changes.length > 0) {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(12);
        doc.text(`Mudanças de Enturmação Detetadas (${changes.length})`, 14, currentY);
        
        autoTable(doc, {
            startY: currentY + 5,
            head: [['RM', 'Nome', 'Série (Antiga > Nova)', 'Turma (Antiga > Nova)', 'Turno (Antiga > Novo)']],
            body: changes.map(c => [
                c.rm, 
                c.nome, 
                `${c.oldSerie || '-'} > ${c.newSerie || '-'}`,
                `${c.oldClasse || '-'} > ${c.newClasse || '-'}`,
                `${c.oldTurno || '-'} > ${c.newTurno || '-'}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 136, 229] },
            styles: { fontSize: 7 }
        });
    } else {
        doc.setFontSize(12);
        doc.text("Nenhuma mudança de enturmação detectada nos cadastros existentes.", 14, currentY);
    }

    doc.save(`Relatorio_Importacao_Alunos_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
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
        // Buscar dados atuais para comparação
        const snapshot = await getDocs(collection(firestore, "alunos"));
        const existingMap = new Map();
        snapshot.forEach(d => existingMap.set(String(d.id), d.data()));

        const inclusions: any[] = [];
        const changes: any[] = [];

        normalizedStudents.forEach(student => {
            if (student.rm) {
                const docId = String(student.rm);
                const existing = existingMap.get(docId);

                if (!existing) {
                    inclusions.push(student);
                } else {
                    const hasSerieChange = student.serie && student.serie !== existing.serie;
                    const hasClasseChange = student.classe && student.classe !== existing.classe;
                    const hasTurnoChange = student.turno && student.turno !== existing.turno;

                    if (hasSerieChange || hasClasseChange || hasTurnoChange) {
                        changes.push({
                            rm: docId,
                            nome: student.nome || existing.nome,
                            oldSerie: existing.serie,
                            newSerie: student.serie,
                            oldClasse: existing.classe,
                            newClasse: student.classe,
                            oldTurno: existing.turno,
                            newTurno: student.turno
                        });
                    }
                }

                const docRef = doc(firestore, "alunos", docId);
                const finalData = { ...student, id: docId, status: "ATIVO" }; 
                setDocumentNonBlocking(docRef, finalData, { merge: true });
            }
        });

        if (inclusions.length > 0 || changes.length > 0) {
            generateSummaryReport(inclusions, changes);
            toast({
                title: "Importação e Relatório!",
                description: `Atualização iniciada. O relatório de alterações foi gerado.`,
            });
        } else {
            toast({
                title: "Processamento Concluído",
                description: "Nenhuma alteração de enturmação ou novo aluno foi detetado.",
            });
        }

        onUploadSuccess();
        setIsOpen(false);
    } catch (error) {
        console.error("Erro na importação:", error);
        toast({
            variant: "destructive",
            title: "Erro no Processamento",
            description: "Ocorreu uma falha ao tentar processar os dados."
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
                    Carregar/Atualizar Base de Alunos
                </Button>
            </SheetTrigger>
             <SheetContent className="flex flex-col">
              <SheetHeader>
                <SheetTitle>Carregar Alunos</SheetTitle>
                <SheetDescription>
                  Envie a listagem para atualizar cadastros existentes ou incluir novos alunos. Ninguém será excluído.
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
          <span>Atualizar Alunos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Atualizar Alunos</SheetTitle>
          <SheetDescription>
            Envie o ficheiro para atualizar informações ou adicionar novos alunos. Um relatório de alterações será gerado automaticamente.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}