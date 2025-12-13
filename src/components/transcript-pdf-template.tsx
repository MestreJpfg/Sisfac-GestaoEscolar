

'use client';

import Image from "next/image";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import React from "react";

interface TranscriptPDFTemplateProps {
    student: any | null;
    isEditing?: boolean;
    onStudentChange?: (student: any) => void;
}

const DetailItem = ({ label, value, isEditing, onChange }: { label: string, value: React.ReactNode, isEditing?: boolean, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    if (!isEditing && (value === null || value === undefined || value === '')) return null;
    return (
        <div>
            <span className="font-bold text-[8px] uppercase">{label}:</span>
            {isEditing ? (
                <Input
                    className={cn(
                        "h-6 text-[9px] p-1 border-dashed",
                        "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    )}
                    value={value as string || ''}
                    onChange={onChange}
                />
            ) : (
                <p className="text-[9px] leading-tight">{value}</p>
            )}
        </div>
    );
};

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


const GradeMatrix = ({ boletim, isEditing, onGradeChange }: { boletim: any, isEditing?: boolean, onGradeChange?: (year: string, disc: string, value: string) => void }) => {
    const disciplinasBase = [
        "Arte/Literatura", "Ciências", "Educacao fisica", "Ensino Religioso",
        "Geografia", "História", "Inglês", "Língua Portuguesa", "Matemática",
    ];
    
    // Anos/Séries a serem exibidos na tabela de notas - SEMPRE MOSTRAR TODOS
    const anosSeries = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];


    const gradeData: { [disciplina: string]: { [serie: string]: string } } = {};

    disciplinasBase.forEach(disc => {
        gradeData[disc] = {};
        anosSeries.forEach(serie => {
            gradeData[disc][serie] = '';
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
                        if (notas.mediaFinal !== null && notas.mediaFinal !== undefined && !isNaN(notas.mediaFinal)) return notas.mediaFinal;
                        const etapaGrades = [notas.etapa1, notas.etapa2, notas.etapa3, notas.etapa4];
                        const validGrades = etapaGrades.filter((g): g is number => g !== null && g !== undefined && !isNaN(g));
                        return validGrades.length > 0 ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length : null;
                    })();

                    const formattedMedia = (mediaCalculada !== null) ? mediaCalculada.toFixed(1).replace('.', ',') : '';
                    const normalizedDiscKey = normalizeString(discKey);
                    const foundDisciplina = disciplinasBase.find(d => normalizeString(d) === normalizedDiscKey);
                    
                    if (foundDisciplina && anosSeries.includes(serieDoAno)) {
                         gradeData[foundDisciplina][serieDoAno] = formattedMedia;
                    }
                });
            }
        });
    }

    if (anosSeries.length === 0 && !isEditing) {
        return <p className="text-center text-[8px] text-gray-500">Nenhum dado de notas encontrado.</p>
    }

    return (
        <table className="w-full text-[8px] border-collapse" style={{ border: '1px solid black' }}>
            <thead>
                <tr className="bg-gray-200">
                    <th className="border border-black p-1 font-bold w-[25%]">Componente Curricular</th>
                    {anosSeries.map(serie => <th key={serie} className="border border-black p-1 font-bold">{serie}</th>)}
                </tr>
            </thead>
            <tbody>
                {disciplinasBase.map(disciplina => (
                    <tr key={disciplina}>
                        <td className="border border-black p-1 font-medium">{disciplina}</td>
                        {anosSeries.map(serie => (
                            <td key={`${disciplina}-${serie}`} className="border border-black p-0 text-center">
                                {isEditing ? (
                                    <Input
                                        className={cn("h-6 text-[9px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
                                        value={gradeData[disciplina]?.[serie] || ''}
                                        onChange={(e) => onGradeChange?.(serie, disciplina, e.target.value)}
                                    />
                                ) : ( gradeData[disciplina]?.[serie] || '-' )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const TrajectoryTable = ({ student, isEditing, onTrajectoryChange }: { student: any, isEditing?: boolean, onTrajectoryChange?: (index: number, field: string, value: string) => void }) => {
    
    const initialRows = React.useMemo(() => {
        const anosSeriesTemplate = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];
        
        // Create a base 9-row structure
        const rows = anosSeriesTemplate.map((serie, index) => ({
            anoSerie: serie,
            anoCivil: '',
            estabelecimento: student.trajectoryData?.[index]?.estabelecimento || 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES',
            municipioUF: student.trajectoryData?.[index]?.municipioUF || 'Fortaleza/CE',
            resultado: student.trajectoryData?.[index]?.resultado || ''
        }));

        // If editing, use the student's trajectoryData if it exists, otherwise the blank template is fine
        if (isEditing) {
             return student.trajectoryData || rows;
        }

        // For viewing, map existing student data onto the template
        if (student.boletim) {
            Object.keys(student.boletim).forEach(year => {
                const yearInfo = student.boletim[year]?.info;
                if (yearInfo?.serie) {
                    const rowIndex = anosSeriesTemplate.indexOf(yearInfo.serie);
                    if (rowIndex !== -1) {
                        rows[rowIndex].anoCivil = year;
                        rows[rowIndex].estabelecimento = yearInfo.estabelecimento || rows[rowIndex].estabelecimento;
                        rows[rowIndex].municipioUF = yearInfo.municipioUF || rows[rowIndex].municipioUF;
                        rows[rowIndex].resultado = yearInfo.resultado || 'Aprovado';
                    }
                }
            });
        }
        
        return rows;

    }, [student, isEditing]);


     if (initialRows.length === 0 && !isEditing) {
        return <p className="text-center text-[8px] text-gray-500">Nenhum dado de trajetória escolar encontrado.</p>
    }

    return (
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
                {initialRows.map((row, index) => (
                    <tr key={index}>
                        {['anoSerie', 'anoCivil', 'estabelecimento', 'municipioUF', 'resultado'].map(field => (
                             <td key={field} className="border border-black p-0 text-center">
                                {isEditing ? (
                                    <Input
                                        className={cn("h-6 text-[9px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
                                        value={row[field] || ''}
                                        onChange={(e) => onTrajectoryChange?.(index, field, e.target.value)}
                                        disabled={field === 'anoSerie'} // Make the series column non-editable
                                    />
                                ) : ( row[field] )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default function TranscriptPDFTemplate({ student, isEditing = false, onStudentChange }: TranscriptPDFTemplateProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);
    
    const handleDetailChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        onStudentChange?.({ ...student, [field]: e.target.value });
    };

    const handleTrajectoryChange = (index: number, field: string, value: string) => {
        const defaultTrajectoryRow = { anoSerie: `${index + 1}º ANO`, anoCivil: '', estabelecimento: 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', municipioUF: 'Fortaleza/CE', resultado: 'Aprovado' };
        const newSeriesData = [...(student.trajectoryData || Array.from({ length: 9 }, (_, i) => ({...defaultTrajectoryRow, anoSerie: `${i + 1}º ANO` })))];
        newSeriesData[index] = { ...newSeriesData[index], [field]: value };
        onStudentChange?.({ ...student, trajectoryData: newSeriesData });
    };
    
    const handleGradeChange = (serie: string, disciplina: string, value: string) => {
        const newBoletim = JSON.parse(JSON.stringify(student.boletim || {}));
        
        // Find the year that corresponds to the 'serie'
        let targetYear = Object.keys(newBoletim).find(y => newBoletim[y]?.info?.serie === serie);

        // If no year found, try to infer it (e.g. from trajectoryData) or create a new one
        if (!targetYear) {
            const trajectoryRow = student.trajectoryData?.find((row: any) => row.anoSerie === serie);
            targetYear = trajectoryRow?.anoCivil || serie.replace(/\D/g,''); // fallback to just the number
            if (!targetYear) { // If still no year, cannot proceed
                console.warn(`Cannot save grade for ${serie} without a corresponding civil year.`);
                return;
            }
        }

        if (!newBoletim[targetYear]) newBoletim[targetYear] = { info: { serie }, notas: {} };
        if (!newBoletim[targetYear].info) newBoletim[targetYear].info = { serie };
        if (!newBoletim[targetYear].notas) newBoletim[targetYear].notas = {};
        
        const normalizedDiscKey = normalizeString(disciplina);
        if (!newBoletim[targetYear].notas[normalizedDiscKey]) newBoletim[targetYear].notas[normalizedDiscKey] = {};
        
        newBoletim[targetYear].notas[normalizedDiscKey].mediaFinal = parseFloat(value.replace(',', '.')) || null;

        onStudentChange?.({ ...student, boletim: newBoletim });
    };

    return (
        <div className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="flex flex-col h-full" style={{padding: '10mm 15mm'}}>
                <header className="flex flex-col items-center text-center text-[9px] font-bold mb-4">
                    <div className="flex items-center gap-4 mb-2"><Image src="/logoyuri.png" alt="Logo" width={60} height={60} unoptimized /></div>
                    <p className="text-[10px] font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                    <p className="text-[8px] font-bold">Ato de Criação: Portaria Nº 105/2021 de 31/12/2021</p>
                    <p className="text-[8px]">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA - CEP: 60831-600</p>
                    <p className="text-[8px]">Fortaleza - CE | Fone: (85) 3488-3209 | E-mail: efernandacollares@institutoassumcao.org.br</p>
                </header>

                <div className="text-center my-4"><h1 className="text-base font-bold tracking-wider uppercase">HISTÓRICO ESCOLAR DO ENSINO FUNDAMENTAL DE 9 (NOVE) ANOS</h1></div>

                <section className="border-t border-b border-black py-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[9px]">
                    <DetailItem label="Nome do Aluno(a)" value={student.nome} isEditing={isEditing} onChange={handleDetailChange('nome')} />
                    <DetailItem label="Registro Acadêmico (RM)" value={student.rm} isEditing={isEditing} onChange={handleDetailChange('rm')} />
                    <DetailItem label="Data de Nascimento" value={student.data_nascimento} isEditing={isEditing} onChange={handleDetailChange('data_nascimento')} />
                    <DetailItem label="Município de Nascimento" value={student.municipio_nascimento || (isEditing ? '' : 'FORTALEZA')} isEditing={isEditing} onChange={handleDetailChange('municipio_nascimento')} />
                    <DetailItem label="UF" value={student.uf_nascimento || (isEditing ? '' : 'CE')} isEditing={isEditing} onChange={handleDetailChange('uf_nascimento')} />
                    <DetailItem label="RG" value={student.rg} isEditing={isEditing} onChange={handleDetailChange('rg')} />
                    <DetailItem label="Mãe" value={student.filiacao_1} isEditing={isEditing} onChange={handleDetailChange('filiacao_1')} />
                    <DetailItem label="Pai" value={student.filiacao_2} isEditing={isEditing} onChange={handleDetailChange('filiacao_2')} />
                </section>
                
                <section className="my-4">
                    <h2 className="text-sm font-bold text-center mb-2">TRAJETÓRIA ESCOLAR</h2>
                    <TrajectoryTable student={student} isEditing={isEditing} onTrajectoryChange={handleTrajectoryChange} />
                </section>
                
                 <section className="my-4 space-y-4">
                     <h2 className="text-sm font-bold text-center mb-2">NOTAS E FREQUÊNCIA POR ANO/SÉRIE</h2>
                     <GradeMatrix boletim={student.boletim} isEditing={isEditing} onGradeChange={handleGradeChange} />
                </section>

                 <footer className="flex flex-col items-center justify-center text-center pt-2 mt-auto text-[9px]">
                    <div className="text-center w-full mb-4">
                        <p className="font-bold">Base Legal:</p>
                        <p>Curso de Ensino Fundamental de 9 (nove) anos, com base na Lei Federal 9.394/96.</p>
                        <p>Escala de Avaliação: Notas de 0 a 10, com média para aprovação 6.0.</p>
                    </div>
                    <p className="my-4">Fortaleza, {formattedDate}.</p>
                    <div className="flex justify-around w-full mt-8">
                         <div className="text-center w-48 relative">
                             <div className="relative h-16 w-full -mb-10" style={{ right: '0.5cm' }}>
                                <Image src="/assinatura.png" alt="Assinatura Gestão Escolar" layout="fill" objectFit="contain" unoptimized />
                            </div>
                            <div className="border-t border-black w-full pt-1">
                                <p className="font-bold">DIRETOR(A)</p>
                                <p>Nome Completo</p>
                                <p>RG: XXXXXXX</p>
                            </div>
                        </div>
                        <div className="text-center w-48 relative">
                             <div className="relative h-16 w-full -mb-10" style={{ right: '0.5cm', bottom: '0.2cm' }}>
                                <Image src="/assinatura2.png" alt="Segunda Assinatura" layout="fill" objectFit="contain" unoptimized />
                            </div>
                             <div className="border-t border-black w-full pt-1">
                                <p className="font-bold">SECRETÁRIO(A) ESCOLAR</p>
                                <p>Nome Completo</p>
                                <p>RG: XXXXXXX</p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
