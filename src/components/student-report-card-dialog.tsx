"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import StudentReportCard from "./student-report-card";

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
  studentName: string;
}

export default function StudentReportCardDialog({
  isOpen,
  onClose,
  boletim,
  studentName,
}: StudentReportCardDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>Boletim de Notas - {studentName}</DialogTitle>
          <DialogDescription>
            Notas do aluno ao longo do ano letivo.
          </DialogDescription>
        </DialogHeader>
        <div className="relative w-full overflow-auto mt-4">
          <StudentReportCard boletim={boletim} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
