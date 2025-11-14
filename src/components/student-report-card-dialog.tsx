"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import StudentReportCard from "./student-report-card";
import { Button } from "./ui/button";
import { Loader2, FileText, FileSpreadsheet, Files } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportCardWithDeclaration from "./report-card-with-declaration";
import ReportCardDetailed from "./report-card-detailed";
import ReportCardCompact from "./report-card-compact";

interface Boletim {
  [disciplina: string]: {
    etapa1?: number | null;
    etapa2?: number | null;
    etapa3?: number | null;
    etapa4?: number | null;
    mediaFinal?: number | null;
  };
}

interface StudentReportCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boletim: Boletim;
  student: any;
}

type PdfType = 'declaration' | 'detailed' | 'compact';

export default function StudentReportCardDialog({
  isOpen,
  onClose,
  boletim,
  student,
}: StudentReportCardDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<PdfType | null>(null);

  const generatePdf = async (type: PdfType) => {
    setIsProcessing(type);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    
    let componentToRender;
    let fileName = `Boletim_${student.nome.replace(/\s+/g, '_')}.pdf`;
    let pdfOptions: any = { orientation: 'p', unit: 'mm', format: 'a4' };

    switch (type) {
        case 'declaration':
            componentToRender = <ReportCardWithDeclaration student={student} boletim={boletim} />;
            fileName = `Declaracao_com_Boletim_${student.nome.replace(/\s+/g, '_')}.pdf`;
            break;
        case 'detailed':
            componentToRender = <ReportCardDetailed student={student} boletim={boletim} />;
            fileName = `Boletim_Detalhado_${student.nome.replace(/\s+/g, '_')}.pdf`;
            break;
        case 'compact':
            componentToRender = <ReportCardCompact student={student} boletim={boletim} />;
            fileName = `Boletim_Compacto_${student.nome.replace(/\s+/g, '_')}.pdf`;
            pdfOptions.orientation = 'l'; // Landscape for compact view
            break;
    }
    
    const declarationElement = document.createElement('div');
    container.appendChild(declarationElement);
    document.body.appendChild(container);

    const reactRoot = await import('react-dom/client').then(m => m.createRoot(declarationElement));
    await new Promise(resolve => {
        reactRoot.render(componentToRender);
        setTimeout(resolve, 500); 
    });

    try {
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF(pdfOptions);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(fileName);

    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Gerar PDF",
          description: "Ocorreu um erro ao criar o ficheiro PDF.",
        });
    } finally {
        reactRoot.unmount();
        document.body.removeChild(container);
        setIsProcessing(null);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>
            Boletim de Notas
            <span className="block text-base font-normal text-muted-foreground mt-1">{student?.nome}</span>
          </DialogTitle>
          <DialogDescription>
            Notas do aluno ao longo do ano letivo. Use os botões abaixo para imprimir.
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full overflow-auto mt-4 border rounded-lg">
          <StudentReportCard boletim={boletim} />
        </div>
        <DialogFooter className="mt-4 pt-4 border-t flex-col sm:flex-col sm:space-x-0 gap-2">
            <p className="text-sm text-center text-muted-foreground mb-2">Opções de Impressão (PDF)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                <Button variant="outline" onClick={() => generatePdf('declaration')} disabled={!!isProcessing}>
                    {isProcessing === 'declaration' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Declaração + Boletim
                </Button>
                <Button variant="outline" onClick={() => generatePdf('detailed')} disabled={!!isProcessing}>
                    {isProcessing === 'detailed' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Boletim Detalhado
                </Button>
                <Button variant="outline" onClick={() => generatePdf('compact')} disabled={!!isProcessing}>
                    {isProcessing === 'compact' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4" />}
                    Boletim Compacto
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
