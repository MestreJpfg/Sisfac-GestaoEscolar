"use client";

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

interface ReportCardCompactProps {
    student: any | null;
    boletim: Boletim;
}

const CompactReport = ({ student, boletim }: ReportCardCompactProps) => {
    if (!student) return null;
    return (
        <div className="border border-black p-2 text-black bg-white" style={{ fontFamily: 'Arial, sans-serif', breakInside: 'avoid-page' }}>
            <h3 className="font-bold text-xs text-center">Boletim Simplificado</h3>
            <div className="flex justify-between text-[10px] mt-1">
                <span><span className="font-bold">Aluno(a):</span> {student.nome}</span>
                <span><span className="font-bold">RM:</span> {student.rm}</span>
            </div>
             <div className="flex justify-between text-[10px]">
                <span><span className="font-bold">Turma:</span> {student.serie} {student.classe}</span>
                <span><span className="font-bold">Turno:</span> {student.turno}</span>
            </div>
            <div className="mt-2">
                <StudentReportCard boletim={boletim} isPrintMode={true} compact={true} />
            </div>
        </div>
    );
};

export default function ReportCardCompact({ student, boletim }: ReportCardCompactProps) {
    if (!student) return null;
    
    // Create an array to repeat the component, simulating a full page for printing
    const reports = Array(4).fill(0);

    return (
        <div className="bg-white p-4" style={{ width: '297mm', height: '210mm' }}>
            <div className="grid grid-cols-2 gap-4 h-full">
                {reports.map((_, index) => (
                    <CompactReport key={index} student={student} boletim={boletim} />
                ))}
            </div>
        </div>
    );
}
