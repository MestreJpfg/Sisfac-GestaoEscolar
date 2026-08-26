
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, User, ShieldAlert, FileText, Users, Printer, Loader2 } from 'lucide-react';
import { ScrollArea } from "./ui/scroll-area";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import OccurrenceParentCommunication from './occurrence-parent-communication';

interface OccurrenceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any | null;
}

export default function OccurrenceDetailDialog({ isOpen, onClose, occurrence }: OccurrenceDetailDialogProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    if (!occurrence) return null;

    const dateObj = new Date(occurrence.date);

    const handlePrintCommunication = async () => {
        setIsGenerating(true);
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        
        const elementToRender = document.createElement('div');
        container.appendChild(elementToRender);
        document.body.appendChild(container);

        try {
            const reactRoot = await import('react-dom/client').then(m => m.createRoot(elementToRender));
            await new Promise<void>(resolve => {
                reactRoot.render(<OccurrenceParentCommunication occurrence={occurrence} />);
                setTimeout(resolve, 800); // Give extra time for images
            });

            const canvas = await html2canvas(elementToRender, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
            pdf.save(`Comunicado_Pais_${occurrence.studentName.replace(/\s+/g, '_')}.pdf`);
            
            reactRoot.unmount();
        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            document.body.removeChild(container);
            setIsGenerating(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{occurrence.type}</Badge>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase">{occurrence.status}</Badge>
                    </div>
                    <DialogTitle className="text-xl font-bold">{occurrence.studentName}</DialogTitle>
                    <DialogDescription>
                        Prontuário Disciplinar • RM: {occurrence.studentId} • {occurrence.studentClass}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] py-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" /> Data
                                </p>
                                <p className="text-sm font-medium">{format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Hora
                                </p>
                                <p className="text-sm font-medium">{format(dateObj, "HH:mm")}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Descrição do Ocorrido
                            </p>
                            <div className="p-3 bg-muted/30 rounded-md border border-border/50 italic text-sm leading-relaxed">
                                "{occurrence.description}"
                            </div>
                        </div>

                        {occurrence.involvedStudents && occurrence.involvedStudents.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <Users className="h-3 w-3" /> Outros Alunos Envolvidos
                                </p>
                                <p className="text-sm">{Array.isArray(occurrence.involvedStudents) ? occurrence.involvedStudents.join(', ') : occurrence.involvedStudents}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <ShieldAlert className="h-3 w-3" /> Penalidade / Medida
                                </p>
                                <p className="text-sm font-semibold text-primary">{occurrence.penalty}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                    <User className="h-3 w-3" /> Relatado por
                                </p>
                                <p className="text-sm font-medium">{occurrence.reportedBy}</p>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="border-t pt-4 mt-2 gap-2">
                    <Button onClick={handlePrintCommunication} variant="outline" className="flex-1" disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Gerar Comunicado
                    </Button>
                    <Button onClick={onClose} variant="secondary">Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
