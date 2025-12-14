

'use client';

import Image from "next/image";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import React, { useState, useEffect, useRef } from "react";
import { municipios } from "@/lib/municipios";
import escolasData from "@/lib/escolas.json";
import { Card, CardContent } from "./ui/card";

interface TranscriptPDFTemplateProps {
    student: any | null;
    isEditing?: boolean;
    onStudentChange?: (student: any) => void;
    allStudents?: any[];
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
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòôõ]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/º/g, '')
    .replace(/\./g, '')
    .replace(/\//g, '-') 
    .replace(/[\[\]*~]/g, '') 
    .replace(/\s+/g, '_');
};


const GradeMatrix = ({ boletim, isEditing, onGradeChange }: { boletim: any, isEditing?: boolean, onGradeChange?: (year: string, disc: string, value: string) => void }) => {
    const disciplinasBase = [
        "Arte", "Ciências", "Educação Física", "Ensino Religioso",
        "Geografia", "História", "Inglês", "Língua Portuguesa", "Matemática",
    ];
    
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
                    
                    let foundDisciplina: string | undefined;
                    const normalizedDiscKey = normalizeString(discKey);

                    const specialMapping: { [key: string]: string } = {
                        'arte-literatura': 'Arte',
                        'lingua_portuguesa': 'Língua Portuguesa',
                        'educacao_fisica': 'Educação Física',
                        'ensino_religioso': 'Ensino Religioso'
                    };

                    if (specialMapping[normalizedDiscKey]) {
                        foundDisciplina = specialMapping[normalizedDiscKey];
                    } else {
                        foundDisciplina = disciplinasBase.find(d => normalizeString(d) === normalizedDiscKey);
                    }
                    
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
                    <th className="border border-black p-1 font-bold w-[25%] align-middle text-center">Componente Curricular</th>
                    {anosSeries.map(serie => <th key={serie} className="border border-black p-1 font-bold align-middle text-center">{serie}</th>)}
                </tr>
            </thead>
            <tbody>
                {disciplinasBase.map(disciplina => (
                    <tr key={disciplina}>
                        <td className="border border-black p-1 font-medium align-middle">{disciplina}</td>
                        {anosSeries.map(serie => (
                            <td key={`${disciplina}-${serie}`} className="border border-black p-0 text-center align-middle">
                                {isEditing ? (
                                    <Input
                                        className={cn("h-6 text-[9px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
                                        value={gradeData[disciplina]?.[serie] || ''}
                                        onChange={(e) => onGradeChange?.(serie, disciplina, e.target.value)}
                                    />
                                ) : ( <div className="p-1 text-center w-full">{gradeData[disciplina]?.[serie] || '-'}</div> )}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const TrajectoryTable = ({ student, isEditing, onTrajectoryChange, allStudents }: { student: any, isEditing?: boolean, onTrajectoryChange?: (index: number, field: string, value: string) => void, allStudents?: any[] }) => {
    
    const [activeAutocomplete, setActiveAutocomplete] = useState<{ index: number, field: string } | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setActiveAutocomplete(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const initialRows = React.useMemo(() => {
        const anosSeriesTemplate = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];
        
        let rows = anosSeriesTemplate.map((serie) => ({
            anoSerie: serie,
            anoCivil: '',
            estabelecimento: '',
            municipioUF: '',
            resultado: ''
        }));

        if (student?.boletim) {
            let processedYears = new Set<string>();

            // Recursive function to process years backwards
            const processYear = (year: number) => {
                if (processedYears.has(String(year))) return;

                const studentDataForYear = allStudents?.find(s => s.rm === student.rm && s.boletim?.[year]);
                const yearData = studentDataForYear?.boletim?.[year];
                
                if (yearData?.info?.serie) {
                    const rowIndex = anosSeriesTemplate.indexOf(yearData.info.serie);
                    if (rowIndex !== -1) {
                        rows[rowIndex].anoCivil = String(year);
                        rows[rowIndex].estabelecimento = yearData.info.estabelecimento || 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES';
                        rows[rowIndex].municipioUF = yearData.info.municipioUF || 'Fortaleza/CE';
                        rows[rowIndex].resultado = yearData.info.resultado || 'Aprovado';
                        processedYears.add(String(year));
                        
                        // Recursively look for the previous year
                        processYear(year - 1);
                    }
                }
            };
            
            // Start processing from all available years in the main student record
            Object.keys(student.boletim).sort((a, b) => parseInt(b) - parseInt(a)).forEach(yearStr => {
                processYear(parseInt(yearStr));
            });
        }
        
        if (student?.trajectoryData) {
            student.trajectoryData.forEach((dbRow: any, index: number) => {
                if (index < rows.length) {
                    rows[index] = { ...rows[index], ...dbRow };
                }
            });
        }
        
        return rows;

    }, [student, allStudents]);

    const handleResultadoChange = (index: number, value: string) => {
        let finalValue = value;
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'a') finalValue = 'Aprovado';
        else if (lowerValue === 'r') finalValue = 'Reprovado';
        else if (lowerValue === 't') finalValue = 'Transferido';

        onTrajectoryChange?.(index, 'resultado', finalValue);
    }
    
    const handleInputChange = (index: number, field: string, value: string) => {
        onTrajectoryChange?.(index, field, value);

        if (value.length > 2) {
            let filteredSuggestions: string[] = [];
            const searchLower = value.toLowerCase();
            if (field === 'municipioUF') {
                filteredSuggestions = municipios
                    .map(m => `${m.nome}/${m.uf}`)
                    .filter(m => m.toLowerCase().includes(searchLower))
                    .slice(0, 5);
            } else if (field === 'estabelecimento') {
                filteredSuggestions = escolasData.escolas
                    .map(e => e.nome)
                    .filter(s => s.toLowerCase().includes(searchLower))
                    .slice(0, 5);
            }
            setSuggestions(filteredSuggestions);
            setActiveAutocomplete({ index, field });
        } else {
            setSuggestions([]);
            setActiveAutocomplete(null);
        }
    };
    
    const handleSelectSuggestion = (index: number, field: string, value: string) => {
        onTrajectoryChange?.(index, field, value);
        setActiveAutocomplete(null);
    };

    return (
        <div ref={wrapperRef}>
             <table className="w-full text-[8px] border-collapse" style={{ border: '1px solid black' }}>
                <thead>
                   <tr className="bg-gray-200">
                        <th className="border border-black p-1 font-bold align-middle text-center">Ano/Série</th>
                        <th className="border border-black p-1 font-bold align-middle text-center">Ano Civil</th>
                        <th className="border border-black p-1 font-bold align-middle text-center">Estabelecimento de Ensino</th>
                        <th className="border border-black p-1 font-bold align-middle text-center">Município/UF</th>
                        <th className="border border-black p-1 font-bold align-middle text-center">Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {initialRows.map((row, index) => (
                        <tr key={index}>
                            {['anoSerie', 'anoCivil', 'estabelecimento', 'municipioUF', 'resultado'].map(field => (
                                 <td key={field} className="border border-black p-0 text-center align-middle relative">
                                    {isEditing ? (
                                        <>
                                            <Input
                                                className={cn("h-6 text-[9px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
                                                value={row[field as keyof typeof row] || ''}
                                                onChange={(e) => {
                                                    if (field === 'resultado') handleResultadoChange(index, e.target.value);
                                                    else handleInputChange(index, field, e.target.value);
                                                }}
                                                onFocus={() => {
                                                    if(field === 'municipioUF' || field === 'estabelecimento') setActiveAutocomplete({index, field});
                                                }}
                                                disabled={field === 'anoSerie'}
                                            />
                                            {activeAutocomplete?.index === index && activeAutocomplete?.field === field && suggestions.length > 0 && (
                                                <Card className="absolute z-20 w-48 shadow-lg mt-1">
                                                    <CardContent className="p-1">
                                                        {suggestions.map(suggestion => (
                                                            <div
                                                                key={suggestion}
                                                                className="p-1.5 text-xs hover:bg-gray-100 cursor-pointer text-left"
                                                                onMouseDown={() => handleSelectSuggestion(index, field, suggestion)}
                                                            >
                                                                {suggestion}
                                                            </div>
                                                        ))}
                                                    </CardContent>
                                                </Card>
                                            )}
                                        </>
                                    ) : ( <div className="p-1 text-center w-full">{row[field as keyof typeof row]}</div> )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function TranscriptPDFTemplate({ student, isEditing = false, onStudentChange, allStudents }: TranscriptPDFTemplateProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);
    
    const handleDetailChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        onStudentChange?.({ ...student, [field]: e.target.value });
    };

    const handleTrajectoryChange = (index: number, field: string, value: string) => {
        const defaultTrajectoryRow = { anoSerie: `${index + 1}º ANO`, anoCivil: '', estabelecimento: 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES', municipioUF: 'Fortaleza/CE', resultado: 'Aprovado' };
        const newSeriesData = [...(student.trajectoryData || Array.from({ length: 9 }, (_, i) => ({...defaultTrajectoryRow, anoSerie: `${i + 1}º ANO` })))];
        (newSeriesData[index] as any)[field] = value;
        onStudentChange?.({ ...student, trajectoryData: newSeriesData });
    };
    
    const handleGradeChange = (serie: string, disciplina: string, value: string) => {
        const newBoletim = JSON.parse(JSON.stringify(student.boletim || {}));
        
        let targetYear: string | undefined = Object.keys(newBoletim).find(y => newBoletim[y]?.info?.serie === serie);

        if (!targetYear) {
            const trajectoryRow = student.trajectoryData?.find((row: any) => row.anoSerie === serie);
            targetYear = trajectoryRow?.anoCivil;
            if (!targetYear) {
                 const tempYear = new Date().getFullYear().toString();
                 if (!newBoletim[tempYear]) newBoletim[tempYear] = { info: { serie }, notas: {} };
                 targetYear = tempYear;
            }
        }
        
        if (!targetYear) return;

        if (!newBoletim[targetYear]) newBoletim[targetYear] = { info: { serie }, notas: {} };
        if (!newBoletim[targetYear].info) newBoletim[targetYear].info = { serie };
        if (!newBoletim[targetYear].notas) newBoletim[targetYear].notas = {};
        
        const normalizedDiscKey = normalizeString(disciplina);
        if (!newBoletim[targetYear].notas[normalizedDiscKey]) newBoletim[targetYear].notas[normalizedDiscKey] = {};
        
        const numericValue = parseFloat(value.replace(',', '.'));
        newBoletim[targetYear].notas[normalizedDiscKey].mediaFinal = isNaN(numericValue) ? null : numericValue;

        onStudentChange?.({ ...student, boletim: newBoletim });
    };

    return (
        <div className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="flex flex-col h-full p-8">
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
                    <TrajectoryTable 
                        student={student} 
                        isEditing={isEditing} 
                        onTrajectoryChange={handleTrajectoryChange}
                        allStudents={allStudents}
                    />
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
                        <p>Modelo de Avaliação para 1º e 2º ANO, uso de Relatório Pedagógico.</p>
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
