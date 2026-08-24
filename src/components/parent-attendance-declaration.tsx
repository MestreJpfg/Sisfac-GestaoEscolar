
"use client";

import Image from "next/image";

interface ParentAttendanceDeclarationProps {
    student: any | null;
}

export default function ParentAttendanceDeclaration({ student }: ParentAttendanceDeclarationProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);

    const formattedTime = new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(today);

    return (
        <div id={`parent-attendance-${student.rm}`} className="bg-white text-black font-sans" style={{ width: '210mm', height: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full p-8">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-[9px] font-bold mb-4">
                    <div className="flex items-center gap-4 mb-4">
                       <Image src="/logoyuri.png" alt="Logo da Prefeitura de Fortaleza" width={50} height={50} crossOrigin="anonymous" />
                       <div className="h-10 border-l border-gray-400"></div>
                       <span className="text-xl font-semibold">EDUCAÇÃO</span>
                    </div>
                    <p className="text-xs font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-[8px] font-bold">COORDENADORIA DO DISTRITO DE EDUCACAO 6</p>
                    <p className="text-[8px] font-normal">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA (85) 34883209 CODEDU: 7183 | MEC-INEP: 23070188</p>
                </header>
                
                {/* Título da Declaração */}
                <div className="text-center my-12">
                    <h1 className="text-2xl font-bold tracking-wider uppercase">DECLARAÇÃO DE COMPARECIMENTO</h1>
                </div>

                {/* Corpo da Declaração com Marca d'Água */}
                <main className="relative text-lg leading-relaxed text-justify flex-grow">
                    <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-15">
                        <Image src="/selo.png" alt="Selo da Escola" width={400} height={400} crossOrigin="anonymous" />
                    </div>
                    <div className="space-y-8 pt-8">
                        <p className="indent-12">
                            Declaramos, para os devidos fins de comprovação junto ao trabalho, que o(a) Sr(a). <strong className="font-bold">{student.filiacao_1 || '________________________________'}</strong>, 
                            portador(a) do CPF nº <strong className="font-bold">{student.cpffiliacao1 || '________________'}</strong>, compareceu a esta Instituição de Ensino na data de hoje, 
                            <strong className="font-bold"> {formattedDate}</strong>, às <strong className="font-bold">{formattedTime}</strong>, para tratar de assuntos de interesse de seu(sua) filho(a) 
                            e nosso(a) aluno(a) <strong className="font-bold">{student.nome}</strong>, devidamente matriculado(a) nesta unidade escolar.
                        </p>
                        
                        <p className="indent-12">
                            A presente declaração é a expressão da verdade e visa justificar a ausência temporária do(a) referido(a) responsável em suas atividades laborais.
                        </p>
                    </div>
                    
                    <p className="mt-24 mb-8 text-center text-lg">
                        Fortaleza, {formattedDate}.
                    </p>
                </main>

                {/* Rodapé */}
                <footer className="flex flex-col items-center justify-center text-center pt-2 mt-auto text-[9px]">
                    <div className="w-full max-w-[220px] mx-auto text-center">
                        <div className="relative h-16 w-full mb-1">
                            <img src="/assinatura.png" alt="Assinatura Gestão Escolar" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                        </div>
                        <div className="border-t border-black w-full pt-1">
                            <p className="font-bold text-xs">DIRETOR(A)</p>
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
