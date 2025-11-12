
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";

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
}

// Helper to format grade display
const formatGrade = (grade: number | null | undefined) => {
    if (grade === null || grade === undefined) return "-";
    return grade.toFixed(1).replace('.', ',');
};

// Helper to get grade color
const getGradeColor = (grade: number | null | undefined) => {
    if (grade === null || grade === undefined) return "text-muted-foreground";
    if (grade < 5) return "text-destructive";
    if (grade >= 7) return "text-blue-500";
    return "text-foreground";
};

export default function StudentReportCard({ boletim }: StudentReportCardProps) {
  if (!boletim || Object.keys(boletim).length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">Nenhuma nota encontrada para este aluno.</p>;
  }

  const processedBoletim = Object.entries(boletim).map(([disciplina, notas]) => {
    const validGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4].filter(
      (nota): nota is number => nota !== null && nota !== undefined
    );
    const media = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null;

    // Use a more readable discipline name
    const formattedDisciplina = disciplina
        .replace(/_/g, ' ') // Substitui underscores por espaços
        .replace(/-/g, '/') // Substitui hífens por barras
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitaliza a primeira letra de cada palavra

    return {
      disciplina: formattedDisciplina,
      ...notas,
      mediaFinal: notas.mediaFinal ?? media,
    };
  }).sort((a, b) => a.disciplina.localeCompare(b.disciplina)); // Sort disciplines alphabetically

  return (
    <div className="relative w-full overflow-auto rounded-lg border">
        <Table>
          <TableCaption>Boletim de notas do aluno.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold text-foreground whitespace-nowrap min-w-[150px]">Disciplina</TableHead>
              <TableHead className="text-center font-bold text-foreground whitespace-nowrap">Etapa 1</TableHead>
              <TableHead className="text-center font-bold text-foreground whitespace-nowrap">Etapa 2</TableHead>
              <TableHead className="text-center font-bold text-foreground whitespace-nowrap">Etapa 3</TableHead>
              <TableHead className="text-center font-bold text-foreground whitespace-nowrap">Etapa 4</TableHead>
              <TableHead className="text-center font-bold text-foreground whitespace-nowrap">Média</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedBoletim.map(({ disciplina, etapa1, etapa2, etapa3, etapa4, mediaFinal }) => (
              <TableRow key={disciplina}>
                <TableCell className="font-medium whitespace-nowrap">{disciplina}</TableCell>
                <TableCell className={`text-center font-semibold ${getGradeColor(etapa1)}`}>{formatGrade(etapa1)}</TableCell>
                <TableCell className={`text-center font-semibold ${getGradeColor(etapa2)}`}>{formatGrade(etapa2)}</TableCell>
                <TableCell className={`text-center font-semibold ${getGradeColor(etapa3)}`}>{formatGrade(etapa3)}</TableCell>
                <TableCell className={`text-center font-semibold ${getGradeColor(etapa4)}`}>{formatGrade(etapa4)}</TableCell>
                <TableCell className={`text-center font-bold ${getGradeColor(mediaFinal)}`}>{formatGrade(mediaFinal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
