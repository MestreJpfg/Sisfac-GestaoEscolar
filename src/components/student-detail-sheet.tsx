
"use client";

import { useState, useMemo } from "react";
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
import StudentTransferDeclaration from "./student-transfer-declaration";
import ParentAttendanceDeclaration from "./parent-attendance-declaration";
import StudentEditDialog from "./student-edit-dialog";
import { User, Calendar, Book, Clock, Users, Phone, Bus, CreditCard, AlertTriangle, FileText, Hash, Loader2, Share2, Pencil, Printer, MapPin, BookCheck, Award, GraduationCap, UserMinus, UserCheck, AlertCircle, Clock9, Info, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import StudentReportCardDialog from "./student-report-card-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import ReportCardWithDeclaration from "./report-card-with-declaration";
import ReportCardDetailed from "./report-card-detailed";
import ReportCardGrid from "./report-card-grid";
import StudentTranscript from "./student-transcript";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";


const formatPhoneNumber = (phone: string): string => {
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  }
  return phone; 
};

type PdfType = 'declaration' | 'transfer' | 'parentAttendance' | 'declarationWithReport' | 'detailedReport' | 'compact' | 'grid' | 'transcript';

interface StudentDetailSheetProps {
  student: any | null;
  allStudents: any[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedStudent: any) => void;
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

const calculateAverage = (boletimAno: any): number => {
    if (!boletimAno || !boletimAno.notas || typeof boletimAno.notas !== 'object') return 0;
    const disciplineKeys = Object.keys(boletimAno.notas);
    const allSubjectAverages: number[] = [];
    disciplineKeys.forEach(key => {
        const disciplina = boletimAno.notas[key];
        if (disciplina && typeof disciplina === 'object' && disciplina.mediaFinal !== null) {
            allSubjectAverages.push(disciplina.mediaFinal);
        }
    });
    return allSubjectAverages.length === 0 ? 0 : allSubjectAverages.reduce((a, b) => a + b, 0) / allSubjectAverages.length;
};


export default function StudentDetailSheet({ student, allStudents, isOpen, onClose, onUpdate }: StudentDetailSheetProps) {
  const [isProcessing, setIsProcessing] = useState<PdfType | null>(null);
  const [isSharing, setIsSharing] = useState<PdfType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [isTransferAlertOpen, setIsTransferAlertOpen] = useState(false);
  const [isReactivateAlertOpen, setIsReactivateAlertOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  const { toast } = useToast();
  const firestore = useFirestore();

  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const classRanking = useMemo(() => {
    if (!student || !allStudents || allStudents.length === 0) return null;
    const classmates = allStudents
      .filter(s => s.serie === student.serie && s.classe === student.classe && s.turno === student.turno)
      .map(s => ({ id: s.id, average: calculateAverage(s.boletim?.[currentYear]) }))
      .filter(s => s.average > 0)
      .sort((a, b) => b.average - a.average);
    const rank = classmates.findIndex(s => s.id === student.id) + 1;
    return rank > 0 ? { rank, total: classmates.length } : null;
  }, [student, allStudents, currentYear]);

  if (!student) return null;

  const isActive = !student.status || student.status === 'ATIVO';

  const currentYearData = student.boletim?.[currentYear]?.notas || null;

  const handleUpdateStudent = async (updatedData: any) => {
    if (!firestore || !student?.rm) return;
    const collectionName = isActive ? 'alunos' : 'exalunos';
    const docRef = doc(firestore, collectionName, String(updatedData.rm));
    setDocumentNonBlocking(docRef, updatedData, { merge: true });
    toast({ title: "Dados Atualizados" });
    onUpdate(updatedData);
    setIsEditDialogOpen(false);
  };

  const handleManualTransfer = async () => {
    if (!firestore || !student) return;
    setIsActionLoading(true);
    try {
        const studentId = String(student.id);
        const activeRef = doc(firestore, 'alunos', studentId);
        const exRef = doc(firestore, 'exalunos', studentId);
        setDocumentNonBlocking(exRef, { ...student, status: 'TRANSFERIDO', updatedAt: new Date().toISOString() });
        deleteDocumentNonBlocking(activeRef);
        toast({ title: "Aluno Transferido" });
        onClose();
    } catch (e) {
        toast({ variant: 'destructive', title: "Erro na transferência" });
    } finally {
        setIsActionLoading(false);
        setIsTransferAlertOpen(false);
    }
  };

  const handleReactivate = async () => {
    if (!firestore || !student) return;
    setIsActionLoading(true);
    try {
        const studentId = String(student.id);
        const exRef = doc(firestore, 'exalunos', studentId);
        const activeRef = doc(firestore, 'alunos', studentId);
        const { status, ...cleanData } = student;
        setDocumentNonBlocking(activeRef, { ...cleanData, status: 'ATIVO', updatedAt: new Date().toISOString() });
        deleteDocumentNonBlocking(exRef);
        toast({ title: "Aluno Reativado", description: "O aluno agora consta na lista de matriculados ativos." });
        onClose();
    } catch (e) {
        toast({ variant: 'destructive', title: "Erro ao reativar" });
    } finally {
        setIsActionLoading(false);
        setIsReactivateAlertOpen(false);
    }
  };
  
  const generatePdfBlob = async (type: PdfType): Promise<Blob | null> => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    let componentToRender;
    let pdfOptions: any = { orientation: 'p', unit: 'mm', format: 'a4' };
    const currentBoletim = student.boletim?.[currentYear]?.notas || {};
    
    switch (type) {
        case 'declaration': componentToRender = <StudentDeclaration student={student} />; break;
        case 'transfer': componentToRender = <StudentTransferDeclaration student={student} />; break;
        case 'parentAttendance': componentToRender = <ParentAttendanceDeclaration student={student} />; break;
        case 'declarationWithReport': componentToRender = <ReportCardWithDeclaration student={student} boletim={currentBoletim} />; break;
        case 'detailedReport': componentToRender = <ReportCardDetailed student={student} boletim={currentBoletim} ranking={classRanking} />; break;
        case 'compact': componentToRender = <ReportCardGrid students={[student]} />; pdfOptions.orientation = 'l'; break;
        case 'grid': componentToRender = <ReportCardGrid students={[student, student, student, student]} />; pdfOptions.orientation = 'l'; break;
        case 'transcript': componentToRender = <StudentTranscript student={student} />; break;
        default: return null;
    }
    
    const elementToRender = document.createElement('div');
    container.appendChild(elementToRender);
    document.body.appendChild(container);
    const reactRoot = await import('react-dom/client').then(m => m.createRoot(elementToRender));
    await new Promise<void>(resolve => { reactRoot.render(componentToRender); setTimeout(resolve, 500); });

    try {
        const canvas = await html2canvas(elementToRender, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF(pdfOptions);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        return pdf.output('blob');
    } catch (error) {
        return null;
    } finally {
        reactRoot.unmount();
        document.body.removeChild(container);
    }
  };

  const handleGeneratePdf = async (type: PdfType) => {
    setIsProcessing(type);
    const blob = await generatePdfBlob(type);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Doc_${type}_${student.nome.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setIsProcessing(null);
  };
  
  const handleShare = async (type: PdfType) => {
    setIsSharing(type);
    const blob = await generatePdfBlob(type);
    if (blob) {
        const file = new File([blob], `Documento_${student.nome}.pdf`, { type: 'application/pdf' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: `Documento - ${student.nome}` });
        } else {
            handleGeneratePdf(type);
        }
    }
    setIsSharing(null);
  };

  const hasAnyBoletim = student.boletim && Object.keys(student.boletim).length > 0;
  
  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md flex flex-col">
          <SheetHeader className="text-left">
            <div className="flex justify-between items-start">
                <SheetTitle className="text-2xl font-bold text-primary flex items-center gap-3">
                <User size={28}/>
                {student.nome || "Detalhes"}
                </SheetTitle>
                <Badge variant={isActive ? "default" : "destructive"} className="mt-1">
                    {student.status || 'ATIVO'}
                </Badge>
            </div>
            <SheetDescription>RM: {student.rm} • {student.serie} {student.classe}</SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 -mr-6 pr-6">
            <Accordion type="multiple" defaultValue={["personal", "academic"]} className="w-full mt-6">
              <AccordionItem value="personal">
                <AccordionTrigger className="text-lg font-semibold">Identificação e Documentos</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <DetailItem icon={Calendar} label="Data de Nascimento" value={student.data_nascimento} />
                  <DetailItem icon={Phone} label="Telefones" value={student.telefones} />
                  <DetailItem icon={FileText} label="RG" value={student.rg} />
                  <DetailItem icon={FileText} label="CPF Aluno" value={student.cpf_aluno} />
                  <DetailItem icon={Hash} label="NIS" value={student.nis} />
                  <DetailItem icon={Hash} label="ID Censo" value={student.id_censo} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="address">
                <AccordionTrigger className="text-lg font-semibold">Endereço e Localização</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <DetailItem icon={MapPin} label="Endereço Completo" value={student.endereco} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="academic">
                <AccordionTrigger className="text-lg font-semibold">Vínculo Académico</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <DetailItem icon={Book} label="Série" value={student.serie} />
                  <DetailItem icon={Users} label="Classe" value={student.classe} />
                  <DetailItem icon={Clock} label="Turno" value={student.turno} />
                  {hasAnyBoletim && (
                    <div className="pt-2 grid grid-cols-2 gap-2">
                        <Button onClick={() => setIsReportCardOpen(true)} variant="outline" className="w-full h-9 text-xs">
                            <BookCheck className="mr-2 h-4 w-4" /> Boletim ({currentYear})
                        </Button>
                        <Button onClick={() => setIsTranscriptOpen(true)} variant="outline" className="w-full h-9 text-xs">
                            <GraduationCap className="mr-2 h-4 w-4" /> Histórico
                        </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="family">
                <AccordionTrigger className="text-lg font-semibold">Família e Filiação</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <DetailItem icon={Users} label="Filiação 1 (Mãe/Responsável)" value={student.filiacao_1} />
                  <DetailItem icon={FileText} label="CPF Filiação 1" value={student.cpffiliacao1} />
                  <DetailItem icon={Users} label="Filiação 2 (Pai/Responsável)" value={student.filiacao_2} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="others">
                <AccordionTrigger className="text-lg font-semibold">Necessidades e Benefícios</AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  <DetailItem icon={ShieldAlert} label="NEE (Necessidade Especial)" value={student.nee} />
                  <DetailItem icon={Bus} label="Transporte Escolar" value={student.transporte_escolar} />
                  <DetailItem icon={CreditCard} label="Carteira de Estudante" value={student.carteira_estudante} />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </ScrollArea>
          
          <SheetFooter className="mt-auto pt-4 border-t gap-2">
             <div className="flex items-center justify-center gap-2 w-full">
              <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}><Pencil className="w-4 h-4 text-primary" /></Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Editar Ficha</p></TooltipContent>
                  </Tooltip>

                  {isActive ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setIsTransferAlertOpen(true)}><UserMinus className="w-4 h-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Transferir Aluno</p></TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-green-600" onClick={() => setIsReactivateAlertOpen(true)}><UserCheck className="w-4 h-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Reativar Matrícula</p></TooltipContent>
                    </Tooltip>
                  )}
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">{isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Printer className="w-4 h-4 text-primary" />}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuItem onClick={() => handleGeneratePdf('transcript')} disabled={!hasAnyBoletim}>
                            <FileText className="mr-2 h-4 w-4" /> Histórico Escolar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePdf('declaration')}>
                            <FileText className="mr-2 h-4 w-4" /> Declaração de Matrícula
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePdf('transfer')}>
                            <FileText className="mr-2 h-4 w-4" /> Declaração de Transferência
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePdf('parentAttendance')}>
                            <Clock9 className="mr-2 h-4 w-4" /> Declaração Comparecimento (Pais)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGeneratePdf('detailedReport')} disabled={!currentYearData}>
                            <BookCheck className="mr-2 h-4 w-4" /> Boletim Detalhado ({currentYear})
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">{isSharing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Share2 className="w-4 h-4 text-primary" />}</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleShare('transcript')} disabled={!hasAnyBoletim}>
                            Histórico (WhatsApp)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('detailedReport')} disabled={!currentYearData}>
                            Boletim (WhatsApp)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare('parentAttendance')}>
                            Declaração Pais (WhatsApp)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TooltipProvider>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      
      <AlertDialog open={isTransferAlertOpen} onOpenChange={setIsTransferAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Transferir Aluno?</AlertDialogTitle>
            <AlertDialogDescription>Mover <strong>{student.nome}</strong> para a base de ex-alunos?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleManualTransfer} className="bg-destructive" disabled={isActionLoading}>Transferir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isReactivateAlertOpen} onOpenChange={setIsReactivateAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Reativar Aluno?</AlertDialogTitle>
            <AlertDialogDescription>Retornar <strong>{student.nome}</strong> para a lista de matriculados ativos?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} className="bg-green-600" disabled={isActionLoading}>Reativar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <StudentReportCardDialog isOpen={isReportCardOpen} onClose={() => setIsReportCardOpen(false)} boletim={student.boletim?.[currentYear]?.notas || {}} student={student} />
      <StudentReportCardDialog isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} boletim={student.boletim || {}} student={student} />
      <StudentEditDialog isOpen={isEditDialogOpen} onClose={() => setIsEditDialogOpen(false)} student={student} onSave={handleUpdateStudent} />
    </>
  );
}
