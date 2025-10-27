"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import StudentDeclaration from "./student-declaration";
import StudentEditDialog from "./student-edit-dialog";
import { User, Calendar, Book, Clock, Users, Phone, Bus, CreditCard, AlertTriangle, FileText, Hash, Download, Loader2, Share2, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";


interface StudentDetailSheetProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Callback to refresh data
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start space-x-4">
      <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="text-base text-foreground font-medium">
          {typeof value === 'boolean' ? 
            (value ? <Badge variant="destructive">SIM</Badge> : <Badge variant="secondary">NÃO</Badge>) :
            Array.isArray(value) ? (
              <div className="flex flex-col space-y-1">
                {value.map((item, index) => <span key={index}>{item}</span>)}
              </div>
            ) :
            (value)
          }
        </div>
      </div>
    </div>
  );
};


export default function StudentDetailSheet({ student, isOpen, onClose, onUpdate }: StudentDetailSheetProps) {
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  if (!student) return null;

  const handleUpdateStudent = async (updatedData: any) => {
    if (!firestore || !student?.rm) return;
    
    const docRef = doc(firestore, 'alunos', student.rm);
    
    try {
      await setDoc(docRef, updatedData, { merge: true });
      toast({
        title: "Sucesso!",
        description: "Os dados do aluno foram atualizados.",
      });
      onUpdate(); // Trigger data refresh
      setIsEditDialogOpen(false); // Close edit dialog
    } catch (error) {
      console.error("Erro ao atualizar aluno:", error);
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: updatedData
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const declarationElement = document.getElementById(`declaration-${student.rm}`);
    
    if (!declarationElement) {
        console.error("Elemento da declaração não encontrado.");
        toast({
          variant: "destructive",
          title: "Erro ao Gerar PDF",
          description: "O elemento da declaração não foi encontrado.",
        });
        return null;
    }

    try {
        const canvas = await html2canvas(declarationElement, {
            scale: 1.5,
            useCORS: true,
            backgroundColor: null, 
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.7); 
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        
        let imgWidth = pdfWidth - 20; 
        let imgHeight = imgWidth / ratio;

        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
        return pdf.output('blob');

    } catch (error) {
        console.error("Erro ao gerar o Blob do PDF:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Gerar PDF",
          description: "Ocorreu um erro ao criar o ficheiro PDF.",
        });
        return null;
    }
  };

  const handleGeneratePdf = async () => {
    setIsProcessing(true);
    const blob = await generatePdfBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Declaracao_${student.nome.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setIsProcessing(false);
  };

  const handleShare = async () => {
    setIsProcessing(true);
    const blob = await generatePdfBlob();
    
    if (!blob) {
      setIsProcessing(false);
      return;
    }

    const fileName = `Declaracao_${student.nome.replace(/\s+/g, '_')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Declaração de Matrícula - ${student.nome}`,
          text: `Segue em anexo a declaração de matrícula para ${student.nome}.`,
        });
      } catch (error) {
         if ((error as DOMException).name !== 'AbortError') {
            console.error('Erro ao partilhar:', error);
            toast({
              variant: "destructive",
              title: "Erro de Partilha",
              description: "Não foi possível partilhar o ficheiro.",
            });
         }
      }
    } else {
      // Fallback to download if share API is not supported
      toast({
        title: "Partilha não suportada",
        description: "A iniciar o download do ficheiro.",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    setIsProcessing(false);
  };


  const studentDetails = [
    { label: "RM", value: student.rm, icon: Hash },
    { label: "Data de Nascimento", value: student.data_nascimento, icon: Calendar },
    { label: "RG", value: student.rg, icon: FileText },
    { label: "CPF Aluno", value: student.cpf_aluno, icon: FileText },
    { label: "NIS", value: student.nis, icon: Hash },
    { label: "ID Censo", value: student.id_censo, icon: Hash },
    { label: "Endereço", value: student.endereco, icon: User },
    { label: "Telefones", value: student.telefones, icon: Phone },
  ];

  const academicDetails = [
    { label: "Ensino", value: student.ensino, icon: Book },
    { label: "Série", value: student.serie, icon: Book },
    { label: "Classe", value: student.classe, icon: Users },
    { label: "Turno", value: student.turno, icon: Clock },
  ];

  const familyDetails = [
    { label: "Filiação 1", value: student.filiacao_1, icon: User },
    { label: "CPF Filiação 1", value: student.cpffiliacao1, icon: FileText },
    { label: "Filiação 2", value: student.filiacao_2, icon: User },
  ];

  const otherDetails = [
    { label: "Transporte Escolar", value: student.transporte_escolar, icon: Bus },
    { label: "Carteira de Estudante", value: student.carteira_estudante, icon: CreditCard },
    { label: "Necessidades Especiais (NEE)", value: student.nee, icon: AlertTriangle },
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <User size={28}/>
              {student.nome || "Detalhes do Aluno"}
            </SheetTitle>
            <SheetDescription>
              Informações completas do aluno.
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="h-full pr-6 flex-1">
            <div className="space-y-8 mt-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Dados Pessoais</h3>
                <div className="space-y-4">
                  {studentDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Dados Académicos</h3>
                <div className="space-y-4">
                  {academicDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </div>
              </div>
              
              <Separator />

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Filiação</h3>
                <div className="space-y-4">
                  {familyDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </div>
              </div>

              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Outras Informações</h3>
                <div className="space-y-4">
                  {otherDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </div>
              </div>
            </div>
          </ScrollArea>
          
          <SheetFooter className="mt-auto pt-4 border-t border-border/20">
            <div className="flex items-center justify-end gap-2">
              <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setIsEditDialogOpen(true)} disabled={isProcessing}>
                          <Pencil className="w-4 h-4" />
                          <span className="sr-only">Editar Aluno</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar Aluno</p>
                    </TooltipContent>
                  </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleGeneratePdf} disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="sr-only">Gerar Declaração em PDF</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gerar Declaração em PDF</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleShare} disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      <span className="sr-only">Partilhar Declaração</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Partilhar Declaração</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </SheetFooter>

          {/* Elemento oculto para gerar o PDF */}
          <div className="absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
              <StudentDeclaration student={student} />
          </div>
        </SheetContent>
      </Sheet>
      
      <StudentEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        student={student}
        onSave={handleUpdateStudent}
      />
    </>
  );
}
