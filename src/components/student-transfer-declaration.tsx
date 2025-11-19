
"use client";

import Image from "next/image";

interface StudentTransferDeclarationProps {
    student: any | null;
}

export default function StudentTransferDeclaration({ student }: StudentTransferDeclarationProps) {
    if (!student) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    return (
        <div id={`transfer-declaration-${student.rm}`} className="bg-white text-black font-sans" style={{ width: '210mm', height: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full p-6 pt-12">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-[9px] font-bold">
                    <div className="flex items-center gap-4 mb-4">
                       <Image src="/logoyuri.png" alt="Logo da Prefeitura de Fortaleza" width={80} height={80} unoptimized />
                       <div className="h-10 border-l border-gray-400"></div>
                       <span className="text-xl font-semibold">EDUCAÇÃO</span>
                    </div>
                    <p className="text-xs font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-[8px] font-bold">COORDENADORIA DO DISTRITO DE EDUCACAO 6</p>
                    <p className="text-[8px] font-normal">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA (85) 34883209 CODEDU: 7183 | MEC-INEP: 23070188</p>
                </header>
                
                {/* Título da Declaração */}
                <div className="text-center my-12">
                    <h1 className="text-2xl font-bold tracking-wider uppercase">DECLARAÇÃO DE TRANSFERÊNCIA</h1>
                </div>

                {/* Corpo da Declaração com Marca d'Água */}
                <main className="relative text-base leading-relaxed text-justify flex-grow">
                    <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-15">
                        <Image src="/selo.png" alt="Selo da Escola" width={400} height={400} unoptimized />
                    </div>
                    <p className="mb-6 indent-12">
                        Declaramos, para os devidos fins, que o(a) aluno(a) <strong className="font-bold">{student.nome || 'N/A'}</strong>, 
                        nascido(a) em {student.data_nascimento || 'N/A'}, filho(a) de {student.filiacao_1 || 'N/A'} e {student.filiacao_2 || 'N/A'},
                        está regularmente matriculado(a) nesta instituição de ensino no ano letivo de {currentYear}, cursando o(a) <strong className="font-bold">{student.serie || 'N/A'}</strong> do 
                        <strong className="font-bold"> {student.ensino || 'N/A'}</strong>, na classe <strong className="font-bold">{student.classe || 'N/A'}</strong>, 
                        no turno da <strong className="font-bold">{student.turno || 'N/A'}</strong>.
                    </p>
                    <p className="mb-6 indent-12">
                        Informamos que foi solicitada a <strong className="font-bold">transferência</strong> do(a) referido(a) aluno(a) para o ano letivo de <strong className="font-bold">2026</strong>.
                    </p>
                     <p className="mt-12 text-right">
                        Fortaleza, {formattedDate}.
                    </p>
                </main>

                 {/* Assinatura */}
                 <div className="pt-8 flex justify-center items-end">
                    <div className="relative text-center w-[250px]">
                        <div className="absolute inset-x-0 top-0 flex justify-center items-center">
                            <Image src="/assinatura.png" alt="Assinatura Gestão Escolar" width={200} height={100} unoptimized className="opacity-80" />
                        </div>
                        <div className="h-12"></div>
                        <p className="text-xs font-semibold">GESTÃO ESCOLAR</p>
                    </div>
                    <div className="text-center text-[8px] leading-tight ml-4">
                        <p>Maria Aparecida da S. Numes</p>
                        <p className="font-bold">Secretária Escolar</p>
                        <p>Registro Nº 37899/65128092 CM</p>
                    </div>
                </div>

                {/* Rodapé */}
                <footer className="mt-auto pt-4">
                     <div className="flex w-full">
                        <div className="h-2 w-full" style={{backgroundColor: '#00857F'}}></div>
                        <div className="h-2 w-1/4" style={{backgroundColor: '#F38A00'}}></div>
                    </div>
                    <div className="flex items-start pt-2 text-[8px] font-bold">
                        <div className="pr-4 border-r border-gray-400">
                             <p>EDUCAÇÃO</p>
                        </div>
                        <div className="pl-4">
                             <p>ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES</p>
                             <p className="font-normal">AV. RECREIO, 1540 - CEP 60831-600 - LAGOA REDONDA</p>
                             <p className="font-normal">INEP 23070188</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
