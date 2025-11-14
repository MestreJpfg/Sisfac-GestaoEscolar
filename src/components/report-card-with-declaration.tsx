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

interface ReportCardWithDeclarationProps {
    student: any | null;
    boletim: Boletim;
}

export default function ReportCardWithDeclaration({ student, boletim }: ReportCardWithDeclarationProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    return (
        <div className="bg-white text-black font-sans p-4" style={{ width: '210mm', height: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-[9px] font-bold mb-2">
                    <div className="flex items-center gap-4 mb-2">
                       <Image src="/logo.png" alt="Logo da Prefeitura de Fortaleza" width={60} height={60} unoptimized />
                       <div className="h-8 border-l border-gray-400"></div>
                       <span className="text-lg font-semibold">EDUCAÇÃO</span>
                    </div>
                    <p className="text-[10px] font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-[7px]">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA | INEP: 23070188</p>
                </header>
                
                {/* Título da Declaração */}
                <div className="text-center my-2">
                    <h1 className="text-xl font-bold tracking-wider uppercase">DECLARAÇÃO COM BOLETIM</h1>
                </div>

                {/* Corpo da Declaração */}
                <main className="text-sm leading-relaxed text-justify mb-4">
                    <p className="mb-2 indent-8">
                        Declaramos, para os devidos fins, que <strong className="font-bold">{student.nome || 'N/A'}</strong>, 
                        filho(a) de {student.filiacao_1 || 'N/A'} e {student.filiacao_2 || 'N/A'},
                        está regularmente matriculado(a) nesta instituição de ensino no ano letivo de {today.getFullYear()},
                        cursando a <strong className="font-bold">{student.serie || 'N/A'}</strong> do 
                        <strong className="font-bold"> {student.ensino || 'N/A'}</strong>, na classe <strong className="font-bold">{student.classe || 'N/A'}</strong>, 
                        no turno da <strong className="font-bold">{student.turno || 'N/A'}</strong>.
                    </p>
                </main>

                {/* Boletim */}
                <div className="flex-grow">
                    <StudentReportCard boletim={boletim} isPrintMode={true} />
                </div>

                {/* Rodapé */}
                <footer className="mt-auto pt-2">
                    <p className="text-center text-[9px] mb-4">
                        Fortaleza, {formattedDate}.
                    </p>
                    <div className="flex justify-center items-end mb-2">
                        <div className="text-center text-[8px] leading-tight">
                            <p className="font-bold">GESTÃO ESCOLAR</p>
                            <p>Maria Aparecida da S. Numes - Secretária Escolar</p>
                        </div>
                    </div>
                     <div className="flex w-full mt-2">
                        <div className="h-1.5 w-full" style={{backgroundColor: '#00857F'}}></div>
                        <div className="h-1.5 w-1/4" style={{backgroundColor: '#F38A00'}}></div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
