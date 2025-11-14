"use client";

import Image from "next/image";
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

interface ReportCardDetailedProps {
    student: any | null;
    boletim: Boletim;
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
        <span className="font-bold">{label}:</span> {value}
    </div>
  );
};


export default function ReportCardDetailed({ student, boletim }: ReportCardDetailedProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    return (
        <div className="bg-white text-black font-sans p-6" style={{ width: '210mm', height: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-xs font-bold mb-4">
                     <div className="flex items-center gap-4 mb-2">
                       <Image src="/logo.png" alt="Logo da Prefeitura de Fortaleza" width={70} height={70} unoptimized />
                       <div className="h-10 border-l border-gray-400"></div>
                       <span className="text-xl font-semibold">EDUCAÇÃO</span>
                    </div>
                    <p className="text-sm font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-xs">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA | INEP: 23070188</p>
                </header>
                
                {/* Título */}
                <div className="text-center my-4">
                    <h1 className="text-2xl font-bold tracking-wider uppercase">Boletim Escolar {today.getFullYear()}</h1>
                </div>

                {/* Informações do Aluno */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-6 border-y py-3">
                    <DetailItem label="Aluno(a)" value={student.nome} />
                    <DetailItem label="RM" value={student.rm} />
                    <DetailItem label="Nascimento" value={student.data_nascimento} />
                    <DetailItem label="Turma" value={`${student.serie || ''} ${student.classe || ''}`} />
                    <DetailItem label="Turno" value={student.turno} />
                    <DetailItem label="Ensino" value={student.ensino} />
                </div>
                
                {/* Boletim */}
                <div className="flex-grow">
                    <StudentReportCard boletim={boletim} isPrintMode={true} />
                </div>

                {/* Rodapé */}
                <footer className="mt-auto pt-4 text-center text-xs">
                    <p>Gerado em: {formattedDate}</p>
                    <p className="font-bold mt-2">GESTÃO ESCOLAR</p>
                </footer>
            </div>
        </div>
    );
}
