
'use client';

import Image from "next/image";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShieldAlert, CalendarDays, Clock, FileText, Users } from 'lucide-react';

interface OccurrenceParentCommunicationProps {
    occurrence: any | null;
}

export default function OccurrenceParentCommunication({ occurrence }: OccurrenceParentCommunicationProps) {
    if (!occurrence) return null;

    const dateObj = new Date(occurrence.date);
    const today = new Date();
    const formattedToday = format(today, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
        <div id={`occ-comm-${occurrence.id}`} className="bg-white text-black font-sans" style={{ width: '210mm', height: '297mm', padding: '20mm', boxSizing: 'border-box' }}>
            <div className="flex flex-col h-full border-[1px] border-gray-200 p-8 relative">
                {/* Marca d'água discreta */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <ShieldAlert size={400} />
                </div>

                {/* Cabeçalho Oficial */}
                <header className="flex flex-col items-center text-center mb-8 border-b pb-6">
                    <div className="flex items-center gap-4 mb-4">
                       <Image src="/logoyuri.png" alt="Logo" width={60} height={60} crossOrigin="anonymous" />
                       <div className="h-12 border-l-2 border-primary/20"></div>
                       <div className="text-left">
                           <h2 className="text-lg font-bold leading-tight">SISTEMA DE GESTÃO ESCOLAR</h2>
                           <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Secretaria Municipal de Educação</p>
                       </div>
                    </div>
                    <p className="text-sm font-bold uppercase">Escola Municipal Professora Fernanda Maria de Alencar Colares</p>
                    <p className="text-[10px] text-gray-600">Avenida Professor José Arthur de Carvalho, 1540 - Lagoa Redonda | INEP: 23070188</p>
                </header>

                {/* Título do Comunicado */}
                <div className="text-center mb-10">
                    <h1 className="text-2xl font-black tracking-[0.2em] uppercase border-y-2 border-black py-2 inline-block px-8">
                        Comunicado Interno
                    </h1>
                    <p className="text-sm mt-2 font-semibold text-gray-600">Ref: Convocação de Pais ou Responsáveis</p>
                </div>

                {/* Corpo do Texto */}
                <main className="flex-grow space-y-8 text-justify">
                    <p className="indent-12 text-lg leading-relaxed">
                        Prezados Pais ou Responsáveis do(a) aluno(a) <strong className="font-bold underline">{occurrence.studentName}</strong>, 
                        matriculado(a) no <strong className="font-bold">{occurrence.studentClass}</strong> (RM: {occurrence.studentId}).
                    </p>

                    <p className="indent-12 text-lg leading-relaxed">
                        Vimos, por meio deste, informar que foi registrado em nosso Prontuário Disciplinar um evento de natureza 
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-bold"> {occurrence.type}</span> ocorrido em 
                        <strong> {format(dateObj, "dd/MM/yyyy")}</strong> às <strong>{format(dateObj, "HH:mm")}</strong>.
                    </p>

                    <div className="bg-gray-50 border-l-4 border-primary p-6 rounded-r-lg italic shadow-sm">
                        <h4 className="not-italic font-bold text-sm uppercase mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Resumo do Registro:
                        </h4>
                        <p className="text-gray-700 leading-relaxed">"{occurrence.description}"</p>
                    </div>

                    <div className="space-y-4">
                        <p className="indent-12 text-lg leading-relaxed">
                            Pela importância de mantermos uma parceria sólida entre Família e Escola para o desenvolvimento integral 
                            do(a) estudante, <strong className="text-primary font-black uppercase">solicitamos a sua presença</strong> nesta 
                            instituição de ensino na data de amanhã, ou no próximo dia útil, para uma breve conversa com a Coordenação Pedagógica 
                            visando esclarecimentos e alinhamento de conduta.
                        </p>
                        <p className="text-sm font-bold text-gray-500 italic">
                            * Medida/Penalidade aplicada no momento: {occurrence.penalty}
                        </p>
                    </div>

                    <p className="text-center text-lg mt-12">
                        Fortaleza, {formattedToday}.
                    </p>
                </main>

                {/* Área de Assinaturas */}
                <footer className="mt-auto pt-10 border-t border-dashed grid grid-cols-2 gap-12">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-full border-t border-black mb-1"></div>
                        <p className="text-[10px] font-bold uppercase">Coordenação / Direção</p>
                        <div className="relative h-12 w-full opacity-60">
                             <img src="/assinatura.png" alt="Assinatura" style={{ width: '100%', height: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="w-full border-t border-black mb-1"></div>
                        <p className="text-[10px] font-bold uppercase">Assinatura do Responsável</p>
                        <p className="text-[8px] text-gray-400 mt-8">Ciente em: ____/____/______</p>
                    </div>
                </footer>

                {/* Rodapé Decorativo */}
                <div className="absolute bottom-0 left-0 right-0 h-1 flex">
                    <div className="flex-grow bg-primary"></div>
                    <div className="w-1/4 bg-orange-400"></div>
                </div>
            </div>
        </div>
    );
}
