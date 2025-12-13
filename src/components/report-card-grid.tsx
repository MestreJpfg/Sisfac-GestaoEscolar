
"use client";

import StudentReportCard from "./student-report-card";

interface Boletim {
  [disciplina: string]: {
    etapa1?: number | null;
    etapa2?: number | null;
    etapa3?: number | null;
    etapa4?: number | null;
    mediaFinal?: number | null;
  } | null;
}

interface ReportCardGridProps {
    students: (any | null)[];
}

const CompactReport = ({ student, boletim }: { student: any; boletim: Boletim }) => {
    if (!student) {
        return <div className="border border-dashed border-gray-300 p-2"></div>;
    }
    return (
        <div className="border border-black p-2 text-black bg-white flex flex-col" style={{ fontFamily: 'Arial, sans-serif', breakInside: 'avoid' }}>
            <h3 className="font-bold text-xs text-center">Boletim Simplificado</h3>
            <div className="text-[10px] mt-1">
                <span className="font-bold">Aluno(a):</span> {student.nome}
            </div>
            <div className="flex justify-between text-[10px]">
                <span><span className="font-bold">Turma:</span> {student.serie} {student.classe}</span>
                <span><span className="font-bold">Turno:</span> {student.turno}</span>
            </div>
            <div className="flex justify-between text-[10px]">
                <span><span className="font-bold">RM:</span> {student.rm}</span>
            </div>
            <div className="mt-2 flex-1 overflow-hidden">
                <StudentReportCard boletim={boletim} isPrintMode={true} compact={true} showRecoveryStatus={true} />
            </div>
        </div>
    );
};

export default function ReportCardGrid({ students }: ReportCardGridProps) {
    const studentChunks = students.length === 1 ? [students] : [students.slice(0, 4)];
    
    // Ensure the last chunk has 4 items, filling with null if necessary
    const lastChunk = studentChunks[studentChunks.length - 1];
    while (lastChunk.length < 4 && students.length > 1) {
        lastChunk.push(null);
    }

    return (
        <div className="bg-white p-4" style={{ width: '297mm', height: '210mm' }}>
            {studentChunks.map((chunk, pageIndex) => (
                 <div key={pageIndex} className="grid grid-cols-2 grid-rows-2 gap-4 h-full" style={{ breakAfter: 'page' }}>
                    {chunk.map((student, index) => (
                        <CompactReport key={student?.id || `empty-${index}`} student={student} boletim={student?.boletim || {}} />
                    ))}
                </div>
            ))}
        </div>
    );
}
