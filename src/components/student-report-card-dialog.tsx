"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import StudentReportCard from "./student-report-card";
import { Button } from "./ui/button";
import { Loader2, Download, Pencil, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportCardWithDeclaration from "./report-card-with-declaration";
import ReportCardDetailed from "./report-card-detailed";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";


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
  boletim: initialBoletim,
  student,
}: StudentReportCardDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<PdfType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableBoletim, setEditableBoletim] = useState<Boletim>({});

  useEffect(() => {
    if (isOpen) {
      // Deep copy to avoid mutating the original prop
      setEditableBoletim(JSON.parse(JSON.stringify(initialBoletim || {})));
    }
  }, [isOpen, initialBoletim]);

  const handleGradeChange = (disciplina: string, etapa: string, value: string) => {
    const numericValue = value === '' ? null : parseFloat(value.replace(',', '.'));
    
    setEditableBoletim(prev => ({
      ...prev,
      [disciplina]: {
        ...prev[disciplina],
        [etapa]: isNaN(numericValue!) ? null : numericValue,
      },
    }));
  };
  
  const handleSaveChanges = () => {
    if (!firestore || !student?.rm) return;

    const studentDocRef = doc(firestore, 'alunos', student.rm);
    const updatedData = { boletim: editableBoletim };

    setDocumentNonBlocking(studentDocRef, updatedData, { merge: true });

    toast({
      title: "Boletim Atualizado",
      description: "As notas foram salvas com sucesso.",
    });

    setIsEditing(false);
    // Note: The parent component will need to refetch data to see the update immediately,
    // or we can update the local state in the parent. The current implementation relies on `onUpdate` prop.
  };

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
            componentToRender = <ReportCardWithDeclaration student={student} boletim={editableBoletim} />;
            fileName = `Declaracao_com_Boletim_${student.nome.replace(/\s+/g, '_')}.pdf`;
            break;
        case 'detailed':
            componentToRender = <ReportCardDetailed student={student} boletim={editableBoletim} />;
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
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          onClose();
        }
    }}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>
            Boletim de Notas
            <span className="block text-base font-normal text-muted-foreground mt-1">{student?.nome}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full overflow-auto mt-4">
            <StudentReportCard boletim={editableBoletim} isEditing={isEditing} onGradeChange={handleGradeChange} />
        </div>
        <DialogFooter className="mt-auto pt-4 border-t">
          <TooltipProvider>
            <div className="flex items-center justify-center gap-2 w-full">
              {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                    </Button>
                    <Button onClick={handleSaveChanges}>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Alterações
                    </Button>
                  </>
              ) : (
                  <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                           <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                              <Pencil className="h-5 w-5" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>Editar Notas</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => generatePdf('declaration')} disabled={!!isProcessing}>
                            {isProcessing === 'declaration' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Declaração com Boletim</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => generatePdf('detailed')} disabled={!!isProcessing}>
                            {isProcessing === 'detailed' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download Boletim Detalhado</p>
                      </TooltipContent>
                    </Tooltip>
                 </>
              )}
            </div>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
