

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
}

const DetailItem = ({ label, value, isEditing, onChange }: { label: string, value: React.ReactNode, isEditing?: boolean, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    if (!isEditing && (value === null || value === undefined || value === '')) return null;
    return (
        <div>
            <span className="font-bold text-[9px] uppercase">{label}:</span>
            {isEditing ? (
                <Input
                    className={cn(
                        "h-6 text-[10px] p-1 border-dashed",
                        "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                    )}
                    value={value as string || ''}
                    onChange={onChange}
                />
            ) : (
                <p className="text-[10px] leading-tight">{value}</p>
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
        <table className="w-full text-[9px] border-collapse" style={{ border: '1px solid black' }}>
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
                            <td key={`${disciplina}-${serie}`} className="border border-black p-0 text-center align-middle" style={{ verticalAlign: 'middle' }}>
                                {isEditing ? (
                                    <Input
                                        className={cn("h-6 text-[11px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
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

const TrajectoryTable = ({ student, isEditing, onTrajectoryChange }: { student: any, isEditing?: boolean, onTrajectoryChange?: (index: number, field: string, value: string) => void }) => {
    
    const [activeAutocomplete, setActiveAutocomplete] = useState<{ index: number, field: string } | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    const tableRows = React.useMemo(() => {
        const anosSeriesTemplate = ["1º ANO", "2º ANO", "3º ANO", "4º ANO", "5º ANO", "6º ANO", "7º ANO", "8º ANO", "9º ANO"];
        let rows = anosSeriesTemplate.map((serie) => ({
            anoSerie: serie,
            anoCivil: '',
            estabelecimento: '',
            municipioUF: '',
            resultado: ''
        }));

        if (student?.boletim) {
            Object.keys(student.boletim).forEach(yearStr => {
                const yearData = student.boletim[yearStr];
                if (yearData?.info?.serie) {
                    const rowIndex = anosSeriesTemplate.indexOf(yearData.info.serie);
                    if (rowIndex !== -1 && (yearData.anoCivil || yearStr)) {
                        rows[rowIndex].anoCivil = yearData.anoCivil || String(yearStr);
                        if (!rows[rowIndex].estabelecimento) rows[rowIndex].estabelecimento = yearData.info.estabelecimento || 'E.M. PROFESSORA FERNANDA MARIA DE ALENCAR COLARES';
                        if (!rows[rowIndex].municipioUF) rows[rowIndex].municipioUF = yearData.info.municipioUF || 'Fortaleza/CE';
                        if (!rows[rowIndex].resultado) rows[rowIndex].resultado = yearData.info.resultado || 'Aprovado';
                    }
                }
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
    }, [student]);

    const handleAnoCivilChange = (index: number, value: string) => {
        onTrajectoryChange?.(index, 'anoCivil', value);
    
        const startYear = parseInt(value, 10);
        if (!isNaN(startYear) && index === 0) {
            for (let i = 1; i < 9; i++) {
                const nextYear = String(startYear + i);
                onTrajectoryChange?.(i, 'anoCivil', nextYear);
            }
        }
    };


    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setActiveAutocomplete(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    const handleResultadoChange = (index: number, value: string) => {
        let finalValue = value;
        const lowerValue = value.toLowerCase();
        if (lowerValue === 'a') finalValue = 'Aprovado';
        else if (lowerValue === 'r') finalValue = 'Reprovado';
        else if (lowerValue === 't') finalValue = 'Transferido';

        onTrajectoryChange?.(index, 'resultado', finalValue);
    }
    
    const handleInputChange = (index: number, field: string, value: string) => {
        if (field === 'anoCivil') {
            handleAnoCivilChange(index, value);
            return;
        }

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
             <table className="w-full text-[9px] border-collapse" style={{ border: '1px solid black' }}>
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
                    {tableRows.map((row, index) => (
                        <tr key={index}>
                            {['anoSerie', 'anoCivil', 'estabelecimento', 'municipioUF', 'resultado'].map(field => (
                                 <td key={field} className="border border-black p-0 text-center align-middle relative" style={{ verticalAlign: 'middle' }}>
                                    {isEditing ? (
                                        <>
                                            <Input
                                                className={cn("h-6 text-[11px] p-1 text-center border-dashed rounded-none", "bg-white text-black border-blue-300 focus:border-blue-500 focus:ring-blue-500")}
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

const ConclusionCertificate = ({ student, date }: { student: any, date: string }) => {
    const ninthGradeYear = student?.trajectoryData?.find((t: any) => t.anoSerie === '9º ANO')?.anoCivil || new Date().getFullYear();

    return (
        <div 
            className="bg-white text-black font-serif p-8 flex flex-col justify-between relative" 
            style={{ 
                width: '297mm', 
                height: '210mm', 
                boxSizing: 'border-box'
            }}
        >
            <div className="absolute inset-0 border-[10px]" style={{ borderColor: '#00564d' }}>
                 <div className="absolute inset-2 border-2" style={{ borderColor: '#b2945b' }}></div>
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <header className="flex justify-between items-center text-black">
                    <div className="w-24 h-24 relative">
                        <Image src="/logoyuri.png" alt="Logo" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold" style={{ color: '#00564d' }}>ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES</h1>
                        <p className="text-xs">Reconhecida pela Portaria Nº 105/2021 de 31/12/2021</p>
                    </div>
                    <div className="w-24 h-24 relative">
                        <Image src="/selo.png" alt="Selo da Escola" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                    </div>
                </header>
                <main className="text-center flex-grow flex flex-col justify-center items-center -mt-8">
                    <h2 className="text-5xl font-bold tracking-widest uppercase" style={{ color: '#b2945b' }}>Certificado</h2>
                    <p className="text-lg mt-4">Certificamos que</p>
                    <p className="text-4xl font-semibold italic my-4" style={{ fontFamily: 'Brush Script MT, cursive' }}>
                        {student?.nome || '________________'}
                    </p>
                    <p className="text-base max-w-2xl mx-auto">
                        concluiu com aproveitamento o <strong className="font-semibold">Ensino Fundamental</strong>,
                        em conformidade com a legislação vigente, nesta instituição de ensino no ano letivo de {ninthGradeYear}.
                    </p>
                </main>
                <footer className="flex justify-between items-end text-center text-xs mt-8">
                    <div className="w-1/3">
                        <div className="border-t-2 border-dashed border-gray-500 mx-auto w-4/5 pt-1">
                            <p className="mt-2 text-sm">{date}</p>
                            <p className="font-semibold text-sm" style={{ color: '#00564d' }}>Data de Emissão</p>
                        </div>
                    </div>
                    <div className="w-1/3">
                        <div className="relative h-20 w-48 mx-auto -mb-8">
                            <Image src="/assinatura.png" alt="Assinatura" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                        </div>
                        <div className="border-t-2 border-dashed border-gray-500 mx-auto w-4/5 pt-1">
                            <p className="font-semibold text-sm" style={{ color: '#00564d' }}>Direção Escolar</p>
                        </div>
                    </div>
                    <div className="w-1/3">
                        <div className="relative h-16 w-48 mx-auto -mb-6">
                            <Image src="/secretaria.png" alt="Assinatura Secretaria" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                        </div>
                         <div className="border-t-2 border-dashed border-gray-500 mx-auto w-4/5 pt-1">
                            <p className="font-semibold text-sm" style={{ color: '#00564d' }}>Secretário(a) Escolar</p>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};


export default function TranscriptPDFTemplate({ student, isEditing = false, onStudentChange }: TranscriptPDFTemplateProps) {
    if (!student) return null;

    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(today);
    
    const ninthGradeRow = student.trajectoryData?.find((row: any) => row.anoSerie === '9º ANO');
    const isNinthGradeApproved = ninthGradeRow?.resultado?.toLowerCase() === 'aprovado';

    const handleDetailChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        if (field === 'data_nascimento') {
            value = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3').slice(0, 10);
        }
        onStudentChange?.({ ...student, [field]: value });
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
        <div>
            <div id="transcript-page" className="bg-white text-black font-sans" style={{ width: '210mm', minHeight: '297mm' }}>
                <div className="flex flex-col h-full p-6 space-y-1">
                    <header className="flex flex-col items-center text-center text-[9px] font-bold mb-1">
                        <div className="flex items-center gap-4 mb-1"><Image src="/logoyuri.png" alt="Logo" width={60} height={60} crossOrigin="anonymous" /></div>
                        <p className="text-[10px] font-bold">ESCOLA MUNICIPAL PROFESSORA FERNANDA MARIA DE ALENCAR COLARES - EI / EF</p>
                        <p className="text-[8px] font-bold">Ato de Criação: Portaria Nº 105/2021 de 31/12/2021</p>
                        <p className="text-[8px]">AVENIDA PROFESSOR JOSE ARTHUR DE CARVALHO, Nº 1540, LAGOA REDONDA - CEP: 60831-600</p>
                        <p className="text-[8px]">Fortaleza - CE | Fone: (85) 3488-3209 | E-mail: efernandacollares@institutoassumcao.org.br</p>
                    </header>

                    <div className="text-center my-1"><h1 className="text-base font-bold tracking-wider uppercase">HISTÓRICO ESCOLAR DO ENSINO FUNDAMENTAL DE 9 (NOVE) ANOS</h1></div>

                    <section className="border-t border-b border-black py-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        <DetailItem label="Nome do Aluno(a)" value={student.nome} isEditing={isEditing} onChange={handleDetailChange('nome')} />
                        <DetailItem label="Registro Acadêmico (RM)" value={student.rm} isEditing={isEditing} onChange={handleDetailChange('rm')} />
                        <DetailItem label="Data de Nascimento" value={student.data_nascimento} isEditing={isEditing} onChange={handleDetailChange('data_nascimento')} />
                        <DetailItem label="CPF" value={student.cpf_aluno} isEditing={isEditing} onChange={handleDetailChange('cpf_aluno')} />
                        <DetailItem label="Mãe" value={student.filiacao_1} isEditing={isEditing} onChange={handleDetailChange('filiacao_1')} />
                        <DetailItem label="Pai" value={student.filiacao_2} isEditing={isEditing} onChange={handleDetailChange('filiacao_2')} />
                    </section>
                    
                    <section className="my-1">
                        <h2 className="text-sm font-bold text-center mb-1">UNIDADE ESCOLAR</h2>
                        <TrajectoryTable 
                            student={student} 
                            isEditing={isEditing} 
                            onTrajectoryChange={handleTrajectoryChange}
                        />
                    </section>
                    
                    <section className="my-1">
                        <h2 className="text-sm font-bold text-center mb-1">NOTAS E FREQUÊNCIA POR ANO/SÉRIE</h2>
                        <GradeMatrix boletim={student.boletim} isEditing={isEditing} onGradeChange={handleGradeChange} />
                    </section>

                    {isNinthGradeApproved && (
                        <section className="my-1 text-center text-[10px] font-semibold">
                            <p>Certificamos que o(a) aluno(a) acima qualificado(a) concluiu o Ensino Fundamental e está apto(a) a cursar o Ensino Médio.</p>
                        </section>
                    )}

                    <footer className="flex flex-col items-center justify-center text-center pt-1 mt-auto text-[9px]">
                        <div className="text-center w-full mb-1">
                            <p className="text-[8px] leading-tight"><span className="font-bold">Base Legal:</span> Curso de Ensino Fundamental de 9 (nove) anos, com base na Lei Federal 9.394/96. Escala de Avaliação: Notas de 0 a 10, com média para aprovação 6.0. Modelo de Avaliação para 1º e 2º ANO, uso de Relatório Pedagógico.</p>
                        </div>
                        <p className="text-[10px]">Fortaleza, {formattedDate}.</p>
                        <div className="flex justify-around w-full mt-2 items-end">
                            <div className="text-center w-56 relative">
                                <div className="relative h-20 w-full -mb-8">
                                    <Image src="/assinatura.png" alt="Assinatura Gestão Escolar" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                                </div>
                                <div className="border-t border-black w-full pt-1">
                                    <p className="font-bold">DIRETOR(A)</p>
                                </div>
                            </div>
                            <div className="text-center w-56 relative">
                                <div className="relative h-20 w-full -mb-8">
                                    <Image src="/secretaria.png" alt="Assinatura Secretaria" layout="fill" objectFit="contain" crossOrigin="anonymous" />
                                </div>
                                <div className="border-t border-black w-full pt-1">
                                    <p className="font-bold">SECRETÁRIO(A) ESCOLAR</p>
                                </div>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
            {isNinthGradeApproved && (
                <div id="certificate-page-wrapper" className="relative mt-4 mx-auto" style={{ width: '297mm', height: '210mm' }}>
                    <ConclusionCertificate student={student} date={formattedDate} />
                </div>
            )}
        </div>
    );
}
