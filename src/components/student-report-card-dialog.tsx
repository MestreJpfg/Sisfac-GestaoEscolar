
"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, Download, Pencil, Save, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReportCardWithDeclaration from "./report-card-with-declaration";
import ReportCardDetailed from "./report-card-detailed";
import ReportCardCompact from "./report-card-compact";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import StudentTranscript from "./student-transcript";


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
  boletim: Boletim | { [year: string]: Boletim }; // Can be single year or all years
  student: any;
}

type PdfType = 'declaration' | 'detailed' | 'compact';

export default function StudentReportCardDialog({
  isOpen,
  onClose,
  boletim: initialBoletim,
  student,
}: StudentReportCardDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState<PdfType | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableBoletim, setEditableBoletim] = useState<any>({});
  
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const isTranscriptView = useMemo(() => {
    // Se o primeiro nível de chaves do boletim forem anos (ex: "2023", "2024"), é um histórico.
    const keys = Object.keys(initialBoletim || {});
    return keys.length > 0 && /^\d{4}$/.test(keys[0]);
  }, [initialBoletim]);

  useEffect(() => {
    if (isOpen) {
      setEditableBoletim(JSON.parse(JSON.stringify(initialBoletim || {})));
    }
  }, [isOpen, initialBoletim]);

  const subjectsInRecovery = useMemo(() => {
    const boletimForCurrentYear = isTranscriptView ? editableBoletim[currentYear] : editableBoletim;
    if (!boletimForCurrentYear) return [];
    
    return Object.entries(boletimForCurrentYear)
      .map(([disciplina, notas]: [string, any]) => {
        const validGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4].filter(
          (nota): nota is number => nota !== null && nota !== undefined && !isNaN(nota)
        );
        const media = notas.mediaFinal ?? (validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null);
        
        const cleanedDisciplina = disciplina.replace(/_/g, ' ').replace(/-/g, '/');
        const formattedDisciplina = cleanedDisciplina.charAt(0).toUpperCase() + cleanedDisciplina.slice(1);

        return { disciplina: formattedDisciplina, media };
      })
      .filter(item => item.media !== null && item.media < 6.0)
      .map(item => item.disciplina);
  }, [editableBoletim, currentYear, isTranscriptView]);


  const handleGradeChange = (disciplina: string, etapa: string, value: string, year?: string) => {
    const numericValue = value === '' ? null : parseFloat(value.replace(',', '.'));
    
    setEditableBoletim((prev: any) => {
        const newBoletim = JSON.parse(JSON.stringify(prev));
        if (year) { // Transcript view
            if (!newBoletim[year]) newBoletim[year] = {};
            if (!newBoletim[year][disciplina]) newBoletim[year][disciplina] = {};
            newBoletim[year][disciplina][etapa] = isNaN(numericValue!) ? null : numericValue;
        } else { // Single year view
            if (!newBoletim[disciplina]) newBoletim[disciplina] = {};
            newBoletim[disciplina][etapa] = isNaN(numericValue!) ? null : numericValue;
        }
        return newBoletim;
    });
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
    const boletimToRender = isTranscriptView ? editableBoletim[currentYear] : editableBoletim;


    switch (type) {
        case 'declaration':
            componentToRender = <ReportCardWithDeclaration student={student} boletim={boletimToRender} />;
            fileName = `Declaracao_com_Boletim_${student.nome.replace(/\s+/g, '_')}.pdf`;
            break;
        case 'detailed':
            componentToRender = <ReportCardDetailed student={student} boletim={boletimToRender} ranking={null} />;
            fileName = `Boletim_Detalhado_${student.nome.replace(/\s+/g, '_')}.pdf`;
            break;
        case 'compact':
            componentToRender = <ReportCardCompact student={student} boletim={boletimToRender} />;
            fileName = `Boletim_Compacto_${student.nome.replace(/\s+/g, '_')}.pdf`;
            pdfOptions.orientation = 'l';
            break;
    }
    
    const elementToRender = document.createElement('div');
    container.appendChild(elementToRender);
    document.body.appendChild(container);

    const reactRoot = await import('react-dom/client').then(m => m.createRoot(elementToRender));
    await new Promise<void>(resolve => {
        reactRoot.render(componentToRender);
        setTimeout(resolve, 500); 
    });

    try {
        const canvas = await html2canvas(elementToRender, { scale: 2, useCORS: true });
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

  const renderContent = () => {
    if (isTranscriptView) {
        const years = Object.keys(editableBoletim).sort((a,b) => parseInt(b) - parseInt(a));
        return (
            <div className="space-y-8">
                {years.map(year => (
                    <div key={year}>
                        <h3 className="text-xl font-bold mb-2 text-center">Ano Letivo: {year}</h3>
                        <StudentReportCard
                            boletim={editableBoletim[year]}
                            isEditing={isEditing}
                            onGradeChange={(disciplina, etapa, value) => handleGradeChange(disciplina, etapa, value, year)}
                        />
                    </div>
                ))}
            </div>
        );
    }
    
    // Single year view
    return (
        <StudentReportCard
            boletim={editableBoletim}
            isEditing={isEditing}
            onGradeChange={handleGradeChange}
        />
    );
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          onClose();
        }
    }}>
      <DialogContent className="max-w-4xl w-full flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isTranscriptView ? "Histórico Escolar" : "Boletim de Notas"}
            <span className="block text-base font-normal text-muted-foreground mt-1">{student?.nome}</span>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="relative w-full my-4 flex-1">
            {renderContent()}
        </ScrollArea>

        {!isTranscriptView && subjectsInRecovery.length > 0 && !isEditing && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção: Aluno em Recuperação</AlertTitle>
              <AlertDescription>
                O aluno encontra-se em recuperação na(s) seguinte(s) disciplina(s): {subjectsInRecovery.join(', ')}.
              </AlertDescription>
            </Alert>
        )}

        <DialogFooter className="mt-auto pt-4 border-t">
          <TooltipProvider>
            <div className="flex items-center justify-center gap-2 w-full">
              {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => {
                        setEditableBoletim(JSON.parse(JSON.stringify(initialBoletim || {})));
                        setIsEditing(false);
                    }}>
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

                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={!!isProcessing || isTranscriptView}>
                              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isTranscriptView ? "Downloads disponíveis na ficha do aluno" : "Fazer Download"}</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => generatePdf('declaration')}>
                          Declaração com Boletim
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generatePdf('detailed')}>
                          Boletim Detalhado
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => generatePdf('compact')}>
                          Boletim Compacto (p/ Impressão)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                 </>
              )}
            </div>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
