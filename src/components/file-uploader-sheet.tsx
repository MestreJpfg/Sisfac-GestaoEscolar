
"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { doc, collection, getDocs } from "firebase/firestore";
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
import { Upload, Loader2, AlertCircle } from "lucide-react";
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
        
        // Normalização Rigorosa de Data de Nascimento (DD/MM/AAAA)
        if (header === 'data_nascimento' && value) {
          if (typeof value === 'number') { 
            const date = new Date(Date.UTC(0, 0, value - 1));
            if (!isNaN(date.getTime())) {
              processedValue = ('0' + date.getUTCDate()).slice(-2) + '/' + ('0' + (date.getUTCMonth() + 1)).slice(-2) + '/' + date.getUTCFullYear();
            }
          } else if (value instanceof Date) {
            if (!isNaN(value.getTime())) {
               processedValue = ('0' + value.getUTCDate()).slice(-2) + '/' + ('0' + (value.getUTCMonth() + 1)).slice(-2) + '/' + value.getUTCFullYear();
            }
          } else {
             const valStr = String(value).trim();
             if (valStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                 const [y, m, d] = valStr.split('-');
                 processedValue = `${d}/${m}/${y}`;
             } else if (valStr.match(/^\d{4}-\d{2}-\d{2}T.*$/)) {
                 const [y, m, d] = valStr.split('T')[0].split('-');
                 processedValue = `${d}/${m}/${y}`;
             } else {
                 processedValue = valStr;
             }
          }
        }

        if (header === 'telefones' && value) {
            processedValue = String(value).split(/[,;/]/).map(p => p.replace(/\D/g, '')).filter(p => p.length >= 10);
        }

        student[header] = processedValue;
      });

      if (!student.rm) return null;
      student.rm = String(student.rm);
      return student;
    }).filter(Boolean);
  };

  const generateSummaryReport = (inclusions: any[], changes: any[], transfers: any[]) => {
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
    }

    // Seção de Mudanças
    if (changes.length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.text(`Mudanças de Enturmação Detetadas (${changes.length})`, 14, currentY);
        autoTable(doc, {
            startY: currentY + 5,
            head: [['RM', 'Nome', 'Série (Antiga > Nova)', 'Turma (Antiga > Nova)', 'Turno (Antiga > Novo)']],
            body: changes.map(c => [
                c.rm, c.nome, 
                `${c.oldSerie || '-'} > ${c.newSerie || '-'}`,
                `${c.oldClasse || '-'} > ${c.newClasse || '-'}`,
                `${c.oldTurno || '-'} > ${c.newTurno || '-'}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 136, 229] },
            styles: { fontSize: 7 }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Seção de Transferências
    if (transfers.length > 0) {
        if (currentY > 240) { doc.addPage(); currentY = 20; }
        doc.setFontSize(12);
        doc.text(`Alunos Movidos para "Transferidos" (${transfers.length})`, 14, currentY);
        autoTable(doc, {
            startY: currentY + 5,
            head: [['RM', 'Nome', 'Série', 'Turma', 'Status']],
            body: transfers.map(s => [s.rm, s.nome, s.serie, s.classe, 'TRANSFERIDO']),
            theme: 'striped',
            headStyles: { fillColor: [198, 40, 40] },
            styles: { fontSize: 8 }
        });
    }

    doc.save(`Relatorio_Sincronizacao_Alunos_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  const handleUploadComplete = async (data: any[]) => {
    if (!firestore) return;
    setIsLoading(true);
  
    const normalizedNewData = normalizeData(data);
    if (normalizedNewData.length === 0) {
      setIsLoading(false);
      return;
    }
  
    try {
        const snapshot = await getDocs(collection(firestore, "alunos"));
        const existingActiveMap = new Map();
        snapshot.forEach(d => existingActiveMap.set(String(d.id), d.data()));

        const inclusions: any[] = [];
        const changes: any[] = [];
        const transfers: any[] = [];

        const newRms = new Set(normalizedNewData.map(s => String(s.rm)));

        // 1. Identificar Transferências (Estão no BD mas não no ficheiro)
        for (const [rm, student] of existingActiveMap.entries()) {
            if (!newRms.has(rm)) {
                transfers.push(student);
                const exRef = doc(firestore, "exalunos", rm);
                const activeRef = doc(firestore, "alunos", rm);
                setDocumentNonBlocking(exRef, { ...student, status: "TRANSFERIDO", updatedAt: new Date().toISOString() });
                deleteDocumentNonBlocking(activeRef);
            }
        }

        // 2. Processar Novos e Atualizações
        normalizedNewData.forEach(student => {
            const rm = String(student.rm);
            const existing = existingActiveMap.get(rm);

            if (!existing) {
                inclusions.push(student);
            } else {
                const hasChange = (student.serie && student.serie !== existing.serie) || 
                                  (student.classe && student.classe !== existing.classe) || 
                                  (student.turno && student.turno !== existing.turno);
                if (hasChange) {
                    changes.push({
                        rm, nome: student.nome || existing.nome,
                        oldSerie: existing.serie, newSerie: student.serie,
                        oldClasse: existing.classe, newClasse: student.classe,
                        oldTurno: existing.turno, newTurno: student.turno
                    });
                }
            }

            const docRef = doc(firestore, "alunos", rm);
            setDocumentNonBlocking(docRef, { ...student, id: rm, status: "ATIVO" }, { merge: true });
        });

        generateSummaryReport(inclusions, changes, transfers);
        toast({ title: "Sincronização Concluída", description: "O relatório de alterações foi gerado." });
        onUploadSuccess();
        setIsOpen(false);
    } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Erro no Processamento" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant={isPrimaryAction ? "default" : "secondary"} className="flex items-center gap-2 shadow-lg">
          <Upload className="h-4 w-4" />
          <span>Sincronizar Alunos</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Sincronização Master de Alunos</SheetTitle>
          <SheetDescription className="text-destructive font-semibold">
            Atenção: Alunos que não estiverem nesta lista serão movidos para "Transferidos".
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 flex-1">
          <FileUploader onUploadComplete={handleUploadComplete} setIsLoading={setIsLoading} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
