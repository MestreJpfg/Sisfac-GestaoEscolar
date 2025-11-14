"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Boletim {
  [disciplina: string]: {
    etapa1?: number | null;
    etapa2?: number | null;
    etapa3?: number | null;
    etapa4?: number | null;
    mediaFinal?: number | null;
  };
}

interface StudentReportCardProps {
  boletim: Boletim;
  isPrintMode?: boolean;
  compact?: boolean;
}

const formatGrade = (grade: number | null | undefined) => {
    if (grade === null || grade === undefined) return "-";
    return grade.toFixed(1).replace('.', ',');
};

const getGradeColor = (grade: number | null | undefined, isPrintMode?: boolean) => {
    if (isPrintMode) return "text-black";
    if (grade === null || grade === undefined) return "text-muted-foreground";
    if (grade < 6.0) return "text-red-500";
    return "text-blue-600";
};

export default function StudentReportCard({ boletim, isPrintMode = false, compact = false }: StudentReportCardProps) {
  if (!boletim || Object.keys(boletim).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota encontrada para este aluno.</p>;
  }

  const processedBoletim = Object.entries(boletim)
    .filter(([disciplina]) => !['aluno', 'nome_do_aluno', 'matricula', 'rm', 'nome'].includes(disciplina.toLowerCase()))
    .map(([disciplina, notas]) => {
      const validGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4].filter(
        (nota): nota is number => nota !== null && nota !== undefined
      );
      const media = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null;

      const cleanedDisciplina = disciplina
          .replace(/_/g, ' ')
          .replace(/-/g, '/');
      
      const formattedDisciplina = cleanedDisciplina.charAt(0).toUpperCase() + cleanedDisciplina.slice(1).toLowerCase();


      return {
        disciplina: formattedDisciplina,
        ...notas,
        mediaFinal: notas.mediaFinal ?? media,
      };
  }).sort((a, b) => a.disciplina.localeCompare(b.disciplina));

  const tableClasses = compact 
    ? "text-[9px]"
    : isPrintMode 
    ? "text-xs" 
    : "";
  
  const cellPadding = compact ? "p-1" : isPrintMode ? "p-1.5" : "p-4";
  const headCellPadding = compact ? "px-1 py-1" : isPrintMode ? "px-2 py-1.5" : "h-12 px-4";


  return (
    <div className={cn("relative w-full", !isPrintMode && "overflow-auto rounded-lg border")}>
        <Table className={cn(tableClasses, !isPrintMode && "min-w-[600px]")}>
        <TableHeader>
            <TableRow>
            <TableHead className={cn("font-bold text-left", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Disciplina</TableHead>
            <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 1</TableHead>
            <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 2</TableHead>
            <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 3</TableHead>
            <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 4</TableHead>
            <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Média</TableHead>
            </TableRow>
        </TableHeader>
        <TableBody>
            {processedBoletim.map(({ disciplina, etapa1, etapa2, etapa3, etapa4, mediaFinal }) => (
            <TableRow key={disciplina} className={isPrintMode ? "border-b border-gray-300" : ""}>
                <TableCell className={cn("font-medium text-left", cellPadding)}>{disciplina}</TableCell>
                <TableCell className={cn("text-center font-semibold", getGradeColor(etapa1, isPrintMode), cellPadding)}>{formatGrade(etapa1)}</TableCell>
                <TableCell className={cn("text-center font-semibold", getGradeColor(etapa2, isPrintMode), cellPadding)}>{formatGrade(etapa2)}</TableCell>
                <TableCell className={cn("text-center font-semibold", getGradeColor(etapa3, isPrintMode), cellPadding)}>{formatGrade(etapa3)}</TableCell>
                <TableCell className={cn("text-center font-semibold", getGradeColor(etapa4, isPrintMode), cellPadding)}>{formatGrade(etapa4)}</TableCell>
                <TableCell className={cn("text-center font-bold", getGradeColor(mediaFinal, isPrintMode), cellPadding)}>{formatGrade(mediaFinal)}</TableCell>
            </TableRow>
            ))}
        </TableBody>
        </Table>
    </div>
  );
}
