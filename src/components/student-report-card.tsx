
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
import { Input } from "./ui/input";

interface Boletim {
  [disciplina: string]: {
    etapa1?: number | null;
    etapa2?: number | null;
    etapa3?: number | null;
    etapa4?: number | null;
    mediaFinal?: number | null;
  } | null; // Allow discipline entry to be null
}

interface StudentReportCardProps {
  boletim: Boletim;
  isPrintMode?: boolean;
  compact?: boolean;
  isEditing?: boolean;
  onGradeChange?: (disciplina: string, etapa: string, value: string) => void;
  showRecoveryStatus?: boolean;
}

const formatGrade = (grade: number | null | undefined, isEditing = false) => {
    if (grade === null || grade === undefined) return isEditing ? '' : "-";
    
    if (isEditing && grade % 1 === 0) {
        return String(grade);
    }
    
    return grade.toFixed(1).replace('.', ',');
};

const getGradeColor = (grade: number | null | undefined, isPrintMode?: boolean) => {
    if (isPrintMode) return "text-black";
    if (grade === null || grade === undefined) return "text-muted-foreground";
    if (grade < 6.0) return "text-red-500";
    return "text-blue-600";
};

export default function StudentReportCard({ boletim, isPrintMode = false, compact = false, isEditing = false, onGradeChange = () => {}, showRecoveryStatus = false }: StudentReportCardProps) {
  if (!boletim || Object.keys(boletim).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota encontrada para este aluno.</p>;
  }

  const processedBoletim = Object.entries(boletim)
    .filter(([disciplina]) => !['aluno', 'nome_do_aluno', 'matricula', 'rm', 'nome'].includes(disciplina.toLowerCase()))
    .map(([disciplina, notas]) => {
      // **FIX:** Check if 'notas' is null or undefined before accessing its properties.
      const etapaGrades = notas ? [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4] : [null, null, null, null];
      
      const validGrades = etapaGrades.map(g => {
          if (g === null || g === undefined || String(g).trim() === '') return null;
          const numericGrade = parseFloat(String(g).replace(',', '.'));
          return isNaN(numericGrade) ? null : numericGrade;
      }).filter((g): g is number => g !== null);

      const media = validGrades.length > 0 ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length : null;

      const cleanedDisciplina = disciplina
          .replace(/_/g, ' ')
          .replace(/-/g, '/');
      
      const formattedDisciplina = cleanedDisciplina.charAt(0).toUpperCase() + cleanedDisciplina.slice(1);

      return {
        originalDisciplina: disciplina,
        disciplina: formattedDisciplina,
        etapa1: notas?.etapa1,
        etapa2: notas?.etapa2,
        etapa3: notas?.etapa3,
        etapa4: notas?.etapa4,
        mediaFinal: notas?.mediaFinal ?? media,
      };
  }).sort((a, b) => a.disciplina.localeCompare(b.disciplina));

  const tableClasses = compact 
    ? "text-[9px]"
    : isPrintMode 
    ? "text-xs" 
    : "";
  
  const cellPadding = compact ? "p-1" : isPrintMode ? "p-1.5" : "p-2";
  const headCellPadding = compact ? "px-1 py-1" : isPrintMode ? "px-2 py-1.5" : "h-12 px-4";


  return (
    <Table className={cn(tableClasses, !isPrintMode && "min-w-[600px]")}>
      <TableHeader>
          <TableRow>
          <TableHead className={cn("font-bold text-left", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Disciplina</TableHead>
          <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 1</TableHead>
          <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 2</TableHead>
          <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 3</TableHead>
          <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Etapa 4</TableHead>
          <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Média</TableHead>
          {showRecoveryStatus && <TableHead className={cn("text-center font-bold", isPrintMode ? "text-black" : "text-foreground", headCellPadding)}>Situação</TableHead>}
          </TableRow>
      </TableHeader>
      <TableBody>
          {processedBoletim.map(({ originalDisciplina, disciplina, etapa1, etapa2, etapa3, etapa4, mediaFinal }) => {
            const isRecovery = mediaFinal !== null && mediaFinal < 6.0;
            return (
              <TableRow key={disciplina} className={isPrintMode ? "border-b border-gray-300" : ""}>
                  <TableCell className={cn("font-medium text-left", cellPadding)}>{disciplina}</TableCell>
                  
                  {[
                    { value: etapa1, key: 'etapa1' },
                    { value: etapa2, key: 'etapa2' },
                    { value: etapa3, key: 'etapa3' },
                    { value: etapa4, key: 'etapa4' },
                  ].map(etapa => (
                    <TableCell key={etapa.key} className={cn("text-center font-semibold", cellPadding)}>
                      {isEditing ? (
                         <Input
                            type="text"
                            value={formatGrade(etapa.value, true)}
                            onChange={(e) => onGradeChange(originalDisciplina, etapa.key, e.target.value)}
                            className="w-16 h-8 text-center mx-auto"
                         />
                      ) : (
                        <span className={getGradeColor(etapa.value, isPrintMode)}>
                          {formatGrade(etapa.value)}
                        </span>
                      )}
                    </TableCell>
                  ))}
                  
                  <TableCell className={cn("text-center font-bold", getGradeColor(mediaFinal, isPrintMode), cellPadding)}>{formatGrade(mediaFinal)}</TableCell>
                  {showRecoveryStatus && (
                     <TableCell className={cn("text-center font-semibold", cellPadding, isRecovery ? 'text-red-600' : 'text-blue-600')}>
                        {mediaFinal === null ? '-' : isRecovery ? 'Recuperação' : 'Aprovado'}
                     </TableCell>
                  )}
              </TableRow>
            )
          })}
      </TableBody>
    </Table>
  );
}
