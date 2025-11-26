
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

    const subjectsInRecovery = Object.entries(boletim)
      .map(([disciplina, notas]) => {
        const validGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4].filter(
          (nota): nota is number => nota !== null && nota !== undefined && !isNaN(nota)
        );
        const media = notas.mediaFinal ?? (validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null);
        
        const cleanedDisciplina = disciplina.replace(/_/g, ' ').replace(/-/g, '/');
        const formattedDisciplina = cleanedDisciplina.charAt(0).toUpperCase() + cleanedDisciplina.slice(1).toLowerCase();

        return { disciplina: formattedDisciplina, media };
      })
      .filter(item => item.media !== null && item.media < 6.0)
      .map(item => item.disciplina);

    return (
        <div className="bg-white text-black font-sans p-8" style={{ width: '210mm', height: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-xs font-bold mb-4">
                     <div className="flex items-center gap-4 mb-2">
                       <Image src="/logoyuri.png" alt="Logo da Prefeitura de Fortaleza" width={70} height={70} unoptimized />
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
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4 border-y py-2">
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
                 <footer className="flex flex-col items-center justify-center text-center pt-2">
                    {subjectsInRecovery.length > 0 && (
                        <div className="border-t pt-2 mt-4 text-center text-xs w-full">
                            <p className="font-bold">Observações:</p>
                            <p>O aluno encontra-se em recuperação na(s) seguinte(s) disciplina(s): {subjectsInRecovery.join(', ')}.</p>
                        </div>
                    )}
                    <p className="text-xs my-4">Gerado em: {formattedDate}</p>
                    <div className="w-full max-w-xs mx-auto text-center">
                        <div className="relative h-16 w-full">
                           <Image src="/assinatura.png" alt="Assinatura Gestão Escolar" layout="fill" objectFit="contain" unoptimized className="opacity-80" />
                        </div>
                        <div className="border-t-2 border-black w-full pt-1">
                            <p className="text-xs font-semibold">GESTÃO ESCOLAR</p>
                            <p className="text-[9px] leading-tight">Maria Aparecida da S. Numes - Secretária Escolar</p>
                            <p className="text-[9px] leading-tight">Registro Nº 37899/65128092 CM</p>
                        </div>
                    </div>
                    <div className="w-full mt-4">
                        <div className="flex w-full mb-2">
                            <div className="h-1.5 w-full" style={{backgroundColor: '#00857F'}}></div>
                            <div className="h-1.5 w-1/4" style={{backgroundColor: '#F38A00'}}></div>
                        </div>
                        <div className="flex items-start text-[8px] font-bold">
                            <div className="pr-4 border-r border-gray-400 leading-tight">
                                <p>EDUCAÇÃO</p>
                            </div>
                            <div className="pl-4 text-left leading-tight">
                                <p>ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES</p>
                                <p className="font-normal">AV. RECREIO, 1540 - CEP 60831-600 - LAGOA REDONDA</p>
                                <p className="font-normal">INEP 23070188</p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
