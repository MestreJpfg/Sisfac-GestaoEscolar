
'use client';

import Image from "next/image";

interface TranscriptPDFTemplateProps {
    student: any | null;
}

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div>
            <span className="font-bold text-[8px] uppercase">{label}:</span>
            <p className="text-[9px] leading-tight">{value}</p>
        </div>
    );
};

// Normalization function to handle special characters, matching the uploader logic
const normalizeString = (str: string): string => {
    if (typeof str !== 'string') return '';
    return str.trim().toLowerCase()
        .replace(/ç/g, 'c')
        .replace(/ã/g, 'a')
        .replace(/é/g, 'e')
        .replace(/º/g, '')
        .replace(/\./g, '')
        .replace(/\//g, '-')
        .replace(/[\[\]*~]/g, '')
        .replace(/\s+/g, '_');
};


const GradeMatrix = ({ boletim }: { boletim: any }) => {
    const disciplinasBase = [
        "Arte/Literatura",
        "Ciências",
        "Educação Física",
        "Ensino Religioso",
        "Geografia",
        "História",
        "Inglês",
        "Língua Portuguesa",
        "Matemática",
    ];

    const anosSeries = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];

    const gradeData: { [disciplina: string]: { [serie: string]: string } } = {};

    disciplinasBase.forEach(disc => {
        gradeData[disc] = {};
        anosSeries.forEach(serie => {
            gradeData[disc][serie] = '-';
        });
    });

    if (boletim) {
        Object.keys(boletim).forEach(year => {
            const yearData = boletim[year];
            const serieDoAno = yearData?.info?.serie;

            if (serieDoAno && yearData.notas) {
                Object.keys(yearData.notas).forEach(discKey => {
                    const notas = yearData.notas[discKey];
                    if (!notas) return;
                    
                    const mediaCalculada = (() => {
                        const mediaFinalExistente = notas.mediaFinal;
                        if (mediaFinalExistente !== null && mediaFinalExistente !== undefined && !isNaN(mediaFinalExistente)) {
                            return mediaFinalExistente;
                        }

                        const etapaGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4];
                        const validGrades = etapaGrades.map(g => {
                            if (g === null || g === undefined || String(g).trim() === '') return null;
                            const numericGrade = parseFloat(String(g).replace(',', '.'));
                            return isNaN(numericGrade) ? null : numericGrade;
                        }).filter((g): g is number => g !== null);

                        return validGrades.length > 0 ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length : null;
                    })();

                    const formattedMedia = (mediaCalculada !== null && mediaCalculada !== undefined) ? mediaCalculada.toFixed(1).replace('.', ',') : '-';
                    
                    const normalizedDiscKey = normalizeString(discKey);

                    const discDisplayName = disciplinasBase.find(d => 
                        normalizeString(d) === normalizedDiscKey
                    );
                    
                    if (discDisplayName) {
                        gradeData[discDisplayName][serieDoAno] = formattedMedia;
                    }
                });
            }
        });
    }


    return (
        <table className="w-full text-[8px] border-collapse" style={{ border: '1px solid black' }}>
            <thead>
                <tr className="bg-gray-200">
                    <th className="border border-black p-1 font-bold w-[25%]">Componente Curricular</th>
                    {anosSeries.map(serie => (
                        <th key={serie} className="border border-black p-1 font-bold">{serie}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {disciplinasBase.map(disciplina => (
                    <tr key={disciplina}>
                        <td className="border border-black p-1 font-medium">{disciplina}</td>
                        {anosSeries.map(serie => (
                            <td key={`${disciplina}-${serie}`} className="border border-black p-1 text-center">
                                {gradeData[disciplina]?.[serie] || '-'}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};


export default function TranscriptPDFTemplate({ student }: TranscriptPDFTemplateProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(today);
    
    const allYears = student.boletim ? Object.keys(student.boletim).sort((a, b) => parseInt(a) - parseInt(b)) : [];
    const seriesData = allYears.map(year => ({
        year,
        ...student.boletim[year]?.info
    }));

    return (
        <div className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'Arial, sans-serif' }}>
            <div className="flex flex-col h-full p-8">
                {/* Cabeçalho */}
                <header className="flex flex-col items-center text-center text-[9px] font-bold mb-4">
                    <div className="flex items-center gap-4 mb-2">
                       <Image src="/logoyuri.png" alt="Logo" width={60} height={60} unoptimized />
                    </div>
                    <p className="text-[10px] font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-[8px] font-bold">Ato de Criação: Portaria Nº 105/2021 de 31/12/2021</p>
                    <p className="text-[8px]">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA - CEP: 60831-600</p>
                    <p className="text-[8px]">Fortaleza - CE | Fone: (85) 3488-3209 | E-mail: efernandacollares@institutoassumcao.org.br</p>
                </header>

                {/* Título */}
                <div className="text-center my-4">
                    <h1 className="text-base font-bold tracking-wider uppercase">HISTÓRICO ESCOLAR DO ENSINO FUNDAMENTAL DE 9 (NOVE) ANOS</h1>
                </div>

                {/* Identificação do Aluno */}
                <section className="border-t border-b border-black py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                    <DetailItem label="Nome do Aluno(a)" value={student.nome} />
                    <DetailItem label="Registro Acadêmico (RM)" value={student.rm} />
                    <DetailItem label="Data de Nascimento" value={student.data_nascimento} />
                    <DetailItem label="Município de Nascimento" value="FORTALEZA" />
                    <DetailItem label="UF" value="CE" />
                    <DetailItem label="RG" value={student.rg} />
                    <DetailItem label="Mãe" value={student.filiacao_1} />
                    <DetailItem label="Pai" value={student.filiacao_2} />
                </section>

                {/* Trajetória Escolar */}
                <section className="my-4">
                    <h2 className="text-sm font-bold text-center mb-2">TRAJETÓRIA ESCOLAR</h2>
                    <table className="w-full text-[8px] border-collapse" style={{ border: '1px solid black' }}>
                        <thead>
                           <tr className="bg-gray-200">
                                <th className="border border-black p-1 font-bold">Ano/Série</th>
                                <th className="border border-black p-1 font-bold">Ano Civil</th>
                                <th className="border border-black p-1 font-bold">Estabelecimento de Ensino</th>
                                <th className="border border-black p-1 font-bold">Município/UF</th>
                                <th className="border border-black p-1 font-bold">Resultado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seriesData.map(serie => (
                                <tr key={serie.year}>
                                    <td className="border border-black p-1 text-center">{serie.serie}</td>
                                    <td className="border border-black p-1 text-center">{serie.year}</td>
                                    <td className="border border-black p-1">E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES</td>
                                    <td className="border border-black p-1 text-center">Fortaleza/CE</td>
                                    <td className="border border-black p-1 text-center">Aprovado</td>
                                </tr>
                            ))}
                             {/* Placeholder for future years */}
                            {Array.from({ length: Math.max(0, 9 - seriesData.length) }).map((_, i) => (
                                <tr key={`placeholder-${i}`}>
                                    <td className="border border-black p-1 h-6"></td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1"></td>
                                    <td className="border border-black p-1"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* Notas e Frequência */}
                <section className="my-4 space-y-4">
                     <h2 className="text-sm font-bold text-center mb-2">NOTAS E FREQUÊNCIA POR ANO/SÉRIE</h2>
                     <GradeMatrix boletim={student.boletim} />
                </section>
                
                 {/* Rodapé */}
                 <footer className="flex flex-col items-center justify-center text-center pt-2 mt-auto text-[9px]">
                    <div className="text-center w-full mb-4">
                        <p className="font-bold">Base Legal:</p>
                        <p>Curso de Ensino Fundamental de 9 (nove) anos, com base na Lei Federal 9.394/96.</p>
                        <p>Escala de Avaliação: Notas de 0 a 10, com média para aprovação 6.0.</p>
                    </div>

                    <p className="my-4">Fortaleza, {formattedDate}.</p>
                    
                    <div className="flex justify-around w-full mt-8">
                        <div className="text-center">
                            <div className="border-t border-black w-48 mx-auto"></div>
                            <p className="mt-1 font-bold">DIRETOR(A)</p>
                            <p>Nome Completo</p>
                            <p>RG: XXXXXXX</p>
                        </div>
                        <div className="text-center">
                             <div className="border-t border-black w-48 mx-auto"></div>
                            <p className="mt-1 font-bold">SECRETÁRIO(A) ESCOLAR</p>
                            <p>Nome Completo</p>
                            <p>RG: XXXXXXX</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
