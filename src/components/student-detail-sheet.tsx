
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
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import StudentDeclaration from "./student-declaration";
import StudentEditDialog from "./student-edit-dialog";
import StudentReportCard from "./student-report-card";
import { User, Calendar, Book, Clock, Users, Phone, Bus, CreditCard, AlertTriangle, FileText, Hash, Download, Loader2, Share2, Pencil, Printer, MapPin, BookCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import StudentReportCardDialog from "./student-report-card-dialog";

const formatPhoneNumber = (phone: string): string => {
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone; // Return original if not a valid length
};

interface StudentDetailSheetProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  
  let displayValue = value;

  if (label === "Telefones" && Array.isArray(value)) {
    displayValue = (
      <div className="flex flex-col space-y-1">
        {value.map((item, index) => <span key={index}>{formatPhoneNumber(item)}</span>)}
      </div>
    );
  } else if (typeof value === 'boolean') {
    displayValue = value ? <Badge variant="destructive">SIM</Badge> : <Badge variant="secondary">NÃO</Badge>;
  }

  return (
    <div className="flex items-start space-x-4">
      <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <div className="text-base text-foreground font-medium">
          {displayValue}
        </div>
      </div>
    </div>
  );
};

export default function StudentDetailSheet({ student, isOpen, onClose, onUpdate }: StudentDetailSheetProps) {
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const { toast } = useToast();

  if (!student) return null;

  const handleUpdateStudent = async (updatedData: any) => {
    if (!firestore || !student?.rm) return;
    
    const docRef = doc(firestore, 'alunos', student.rm);
    
    setDocumentNonBlocking(docRef, updatedData, { merge: true });

    toast({
        title: "Atualização em andamento...",
        description: "Os dados do aluno estão a ser salvos.",
    });

    onUpdate();
    setIsEditDialogOpen(false);
  };

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    
    const declarationElement = document.createElement('div');
    container.appendChild(declarationElement);
    document.body.appendChild(container);

    const reactRoot = await import('react-dom/client').then(m => m.createRoot(declarationElement));
    await new Promise(resolve => {
        reactRoot.render(<StudentDeclaration student={student} />);
        setTimeout(resolve, 500); 
    });

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            width: container.scrollWidth,
            height: container.scrollHeight,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
        });
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const ratio = canvas.width / canvas.height;
        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / ratio;
        
        if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = imgHeight * ratio;
        }

        pdf.addImage(imgData, 'JPEG', (pdfWidth - imgWidth) / 2, (pdfHeight - imgHeight) / 2, imgWidth, imgHeight);
        return pdf.output('blob');

    } catch (error) {
        console.error("Erro ao gerar o Blob do PDF:", error);
        toast({
          variant: "destructive",
          title: "Erro ao Gerar PDF",
          description: "Ocorreu um erro ao criar o ficheiro PDF.",
        });
        return null;
    } finally {
        reactRoot.unmount();
        document.body.removeChild(container);
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
  
  const handlePrint = async () => {
    setIsProcessing(true);
    const blob = await generatePdfBlob();
    if (blob) {
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
      };

       // Clean up after a short delay
       setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          setIsProcessing(false);
        }, 2000);
    } else {
        setIsProcessing(false);
    }
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

  const parseAddress = (addressString: string) => {
    if (!addressString || typeof addressString !== 'string') {
        return { cep: null, rua: null, bairro: null, enderecoCompleto: addressString };
    }
    
    const cleanedString = addressString.replace(/[()]/g, '');
    const parts = cleanedString.split('-').map(part => part.trim());

    if (parts.length === 4) {
        const [cep, rua, numero, bairro] = parts;
        const fullStreet = numero ? `${rua}, ${numero}` : rua;
        return { cep, rua: fullStreet, bairro, enderecoCompleto: null };
    }
    
    return { cep: null, rua: null, bairro: null, enderecoCompleto: addressString };
  };

  const address = parseAddress(student.endereco);
  
  const studentPhones = student.telefones || (student.telefone ? [student.telefone] : []);

  const studentDetails = [
    { label: "RM", value: student.rm, icon: Hash },
    { label: "Data de Nascimento", value: student.data_nascimento, icon: Calendar },
    { label: "Telefones", value: studentPhones, icon: Phone },
    { label: "RG", value: student.rg, icon: FileText },
    { label: "CPF Aluno", value: student.cpf_aluno, icon: FileText },
    { label: "NIS", value: student.nis, icon: Hash },
    { label: "ID Censo", value: student.id_censo, icon: Hash },
  ];

  const addressDetails = address.enderecoCompleto ? 
    [{ label: "Endereço", value: address.enderecoCompleto, icon: MapPin }] :
    [
      { label: "CEP", value: address.cep, icon: MapPin },
      { label: "Endereço", value: address.rua, icon: MapPin },
      { label: "Bairro", value: address.bairro, icon: MapPin },
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

  const hasBoletim = student.boletim && Object.keys(student.boletim).length > 0;

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
          
          <ScrollArea className="flex-1 -mr-6 pr-6">
            <Accordion type="multiple" defaultValue={["personal", "academic"]} className="w-full mt-6">

              <AccordionItem value="personal">
                <AccordionTrigger className="text-lg font-semibold text-foreground">Dados Pessoais</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {studentDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="academic">
                <AccordionTrigger className="text-lg font-semibold text-foreground">Dados Acadêmicos</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {academicDetails.map(item => <DetailItem key={item.label} {...item} />)}
                   {hasBoletim && (
                    <div className="pt-2">
                        <Button onClick={() => setIsReportCardOpen(true)} variant="outline" className="w-full">
                            <BookCheck className="mr-2 h-4 w-4" />
                            Visualizar Boletim
                        </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="family">
                <AccordionTrigger className="text-lg font-semibold text-foreground">Filiação</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {familyDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="address">
                <AccordionTrigger className="text-lg font-semibold text-foreground">Endereço</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {addressDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="other">
                <AccordionTrigger className="text-lg font-semibold text-foreground">Outras Informações</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {otherDetails.map(item => <DetailItem key={item.label} {...item} />)}
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </ScrollArea>
          
          <SheetFooter className="mt-auto pt-4 border-t border-border/20">
            <div className="flex items-center justify-center gap-2">
              <TooltipProvider>
                 <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)} disabled={isProcessing}>
                          <Pencil className="w-4 h-4 text-primary" />
                          <span className="sr-only">Editar Aluno</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Editar Aluno</p>
                    </TooltipContent>
                  </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handleGeneratePdf} disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Download className="w-4 h-4 text-primary" />
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
                    <Button variant="ghost" size="icon" onClick={handleShare} disabled={isProcessing}>
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <Share2 className="w-4 h-4 text-primary" />
                      )}
                      <span className="sr-only">Partilhar Declaração</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Partilhar Declaração</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handlePrint} disabled={isProcessing}>
                       {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                       <Printer className="w-4 h-4 text-primary" />
                      )}
                       <span className="sr-only">Imprimir Declaração</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Imprimir Declaração</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      {hasBoletim && (
        <StudentReportCardDialog
            isOpen={isReportCardOpen}
            onClose={() => setIsReportCardOpen(false)}
            boletim={student.boletim}
            student={student}
        />
      )}
      
      <StudentEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        student={student}
        onSave={handleUpdateStudent}
      />
    </>
  );
}

    