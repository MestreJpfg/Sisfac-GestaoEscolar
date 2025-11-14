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
import { Loader2, FileText, FileSpreadsheet, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportCardWithDeclaration from "./report-card-with-declaration";
import ReportCardDetailed from "./report-card-detailed";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";


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

type PdfType = 'declaration' | 'detailed';

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
        
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);
        
        iframe.onload = () => {
          try {
              if (iframe.contentWindow) {
                  iframe.contentWindow.focus();
                  iframe.contentWindow.print();
              } else {
                   toast({
                    variant: "destructive",
                    title: "Erro ao Imprimir",
                    description: "Não foi possível aceder ao conteúdo para impressão.",
                  });
              }
          } catch(e) {
               toast({
                variant: "destructive",
                title: "Erro ao Imprimir",
                description: "Não foi possível abrir o diálogo de impressão. Tente desativar o bloqueador de pop-ups.",
              });
          }
          setTimeout(() => {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(url);
          }, 2000);
        };


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
      <DialogContent className="max-w-4xl w-full flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Boletim de Notas
            <span className="block text-base font-normal text-muted-foreground mt-1">{student?.nome}</span>
          </DialogTitle>
          <DialogDescription>
            Notas do aluno ao longo do ano letivo. Use os botões abaixo para imprimir.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="relative w-full overflow-auto">
                <StudentReportCard boletim={boletim} />
            </div>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <TooltipProvider>
            <div className="flex items-center justify-center gap-2 w-full">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => generatePdf('declaration')} disabled={!!isProcessing}>
                      {isProcessing === 'declaration' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Imprimir Declaração com Boletim</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => generatePdf('detailed')} disabled={!!isProcessing}>
                      {isProcessing === 'detailed' ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Imprimir Boletim Detalhado</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
