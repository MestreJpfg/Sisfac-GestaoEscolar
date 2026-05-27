
"use client";

import Image from "next/image";
import StudentReportCard from "./student-report-card";

interface StudentTranscriptProps {
    student: any | null;
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
        <span className="font-bold">{label}:</span> {value}
    </div>
  );
};

export default function StudentTranscript({ student }: StudentTranscriptProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    const years = student.boletim ? Object.keys(student.boletim).sort((a, b) => parseInt(a) - parseInt(b)) : [];

    return (
        <div className="bg-white text-black font-sans p-8" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-xs font-bold mb-4">
                     <div className="flex items-center gap-4 mb-2">
                       <Image src="/logoyuri.png" alt="Logo" width={70} height={70} unoptimized />
                       <div className="h-10 border-l border-gray-400"></div>
                       <span className="text-xl font-semibold">EDUCAÇÃO</span>
                    </div>
                    <p className="text-sm font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-xs">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA | INEP: 23070188</p>
                </header>
                
                {/* Título */}
                <div className="text-center my-4">
                    <h1 className="text-2xl font-bold tracking-wider uppercase">Histórico Escolar</h1>
                </div>

                {/* Informações do Aluno */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4 border-y py-2">
                    <DetailItem label="Aluno(a)" value={student.nome} />
                    <DetailItem label="RM" value={student.rm} />
                    <DetailItem label="Nascimento" value={student.data_nascimento} />
                    <DetailItem label="Filiação" value={student.filiacao_1} />
                     <DetailItem label="" value={student.filiacao_2} />
                </div>
                
                {/* Histórico de Notas */}
                <div className="flex-grow space-y-6">
                    {years.map(year => {
                        const yearData = student.boletim[year];
                        const classInfo = yearData.info ? `${yearData.info.serie || ''} ${yearData.info.classe || ''} - ${yearData.info.turno || ''}` : 'Informação não disponível';
                        return (
                            <div key={year}>
                                <h2 className="text-lg font-bold text-center mb-2">
                                    Ano Letivo: {year} <span className="font-normal text-base">- Turma: {classInfo}</span>
                                </h2>
                                <StudentReportCard boletim={yearData.notas || {}} isPrintMode={true} />
                            </div>
                        )
                    })}
                </div>

                {/* Rodapé */}
                 <footer className="flex flex-col items-center justify-center text-center pt-2 mt-auto">
                    <p className="text-xs my-4">Gerado em: {formattedDate}</p>
                    <div className="w-full max-w-[220px] mx-auto text-center">
                        <div className="relative h-16 w-full mb-1">
                            <img src="/assinatura.png" alt="Assinatura Gestão Escolar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                        </div>
                        <div className="border-t border-black w-full pt-1">
                            <p className="font-bold text-xs">DIRETOR(A)</p>
                        </div>
                    </div>
                    <div className="w-full mt-2">
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
