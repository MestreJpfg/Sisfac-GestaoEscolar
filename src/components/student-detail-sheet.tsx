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
import { User, Calendar, Book, Clock, Users, Phone, Bus, CreditCard, AlertTriangle, FileText, Hash, Download, Loader2 } from "lucide-react";

interface StudentDetailSheetProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
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


export default function StudentDetailSheet({ student, isOpen, onClose }: StudentDetailSheetProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!student) return null;

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    const declarationElement = document.getElementById(`declaration-${student.rm}`);
    
    if (!declarationElement) {
        console.error("Elemento da declaração não encontrado.");
        setIsGeneratingPdf(false);
        return;
    }

    try {
        const canvas = await html2canvas(declarationElement, {
            scale: 1.5, // Reduz a escala para um ficheiro mais leve
            useCORS: true,
            backgroundColor: null, 
        });
        
        // Usa JPEG com qualidade controlada para compressão
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
        
        let imgWidth = pdfWidth - 20; // margem de 10mm de cada lado
        let imgHeight = imgWidth / ratio;

        // Se a altura da imagem for maior que a altura do PDF, ajusta pela altura
        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }

        const x = (pdfWidth - imgWidth) / 2;
        const y = (pdfHeight - imgHeight) / 2;

        // Adiciona a imagem especificando o formato e a compressão
        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
        pdf.save(`Declaracao_${student.nome.replace(/\s+/g, '_')}.pdf`);

    } catch (error) {
        console.error("Erro ao gerar o PDF:", error);
    } finally {
        setIsGeneratingPdf(false);
    }
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
            <Button onClick={handleGeneratePdf} disabled={isGeneratingPdf} className="w-full">
                {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                    <Download className="w-4 h-4 mr-2" />
                )}
                {isGeneratingPdf ? "A Gerar PDF..." : "Gerar Declaração em PDF"}
            </Button>
        </SheetFooter>

        {/* Elemento oculto para gerar o PDF */}
        <div className="absolute -left-[9999px] top-0 opacity-0" aria-hidden="true">
            <StudentDeclaration student={student} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
