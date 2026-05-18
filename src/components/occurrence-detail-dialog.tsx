
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, Clock, User, ShieldAlert, FileText, Users } from 'lucide-react';
import { ScrollArea } from "./ui/scroll-area";

interface OccurrenceDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  occurrence: any | null;
}

export default function OccurrenceDetailDialog({ isOpen, onClose, occurrence }: OccurrenceDetailDialogProps) {
    if (!occurrence) return null;

    const dateObj = new Date(occurrence.date);
    
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

                <DialogFooter className="border-t pt-4 mt-2">
                    <Button onClick={onClose} variant="secondary">Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
