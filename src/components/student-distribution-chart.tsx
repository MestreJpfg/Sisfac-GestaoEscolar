
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

interface StudentDistributionChartProps {
    students: any[];
    isLoading: boolean;
    onDrilldown: (serie: string | null) => void;
    drilledSerie: string | null;
}

const getSeriesNumber = (name: string): number => {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[0], 10) : Infinity;
};

const CustomLabel = (props: any) => {
    const { x, y, width, value, theme } = props;
    const tickColor = theme === 'dark' ? '#ffffff' : '#000000';
    return (
        <text x={x + width / 2} y={y} dy={-4} fill={tickColor} fontSize={12} textAnchor="middle">
            {value}
        </text>
    );
};

const getCapacityForSerie = (serieName: string): number => {
    if (!serieName) return 0;
    const upperCaseSerie = serieName.toUpperCase();
    if (upperCaseSerie.includes('INFANTIL IV') || upperCaseSerie.includes('INFANTIL V') || upperCaseSerie === '1º ANO') return 20;
    if (upperCaseSerie === '2º ANO') return 25;
    if (upperCaseSerie === '3º ANO' || upperCaseSerie === '4º ANO' || upperCaseSerie === '5º ANO') return 30;
    if (['6º ANO', '7º ANO', '8º ANO', '9º ANO'].includes(upperCaseSerie)) return 35;
    return 0; // Fallback
}

export default function StudentDistributionChart({ students, isLoading, onDrilldown, drilledSerie }: StudentDistributionChartProps) {
    const { resolvedTheme } = useTheme();

    const handleBarClick = (payload: any) => {
        if (payload && payload.activePayload && payload.activePayload[0]) {
            const serieName = payload.activePayload[0].payload.name;
            if (!drilledSerie) {
                onDrilldown(serieName);
            }
        }
    };
    
    const data = useMemo(() => {
        if (isLoading || !students) return [];

        if (drilledSerie) {
            const filteredStudents = students.filter(s => s.serie === drilledSerie);
            const classCount = filteredStudents.reduce((acc, student) => {
                const key = `${student.classe || 'N/C'} - ${student.turno || 'N/T'}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });
            
            const capacityForDrilledSerie = getCapacityForSerie(drilledSerie);

            return Object.keys(classCount)
                .map(className => ({
                    name: className,
                    Matriculados: classCount[className],
                    Capacidade: capacityForDrilledSerie,
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        } else {
             const seriesCount = students
                .filter(student => student.serie) 
                .reduce((acc, student) => {
                    const serie = student.serie;
                    if (!acc[serie]) {
                        acc[serie] = { count: 0, classes: new Set() };
                    }
                    acc[serie].count++;
                    acc[serie].classes.add(`${student.classe}-${student.turno}`);
                    return acc;
                }, {} as { [key: string]: { count: number, classes: Set<string> } });

            return Object.keys(seriesCount)
                .map(serie => {
                    const numClasses = seriesCount[serie].classes.size;
                    const capacityPerClass = getCapacityForSerie(serie);
                    return {
                        name: serie,
                        Matriculados: seriesCount[serie].count,
                        Capacidade: capacityPerClass * numClasses
                    }
                })
                .sort((a, b) => {
                    const numA = getSeriesNumber(a.name);
                    const numB = getSeriesNumber(b.name);
                    
                    if (numA !== Infinity && numB !== Infinity) {
                        return numA - numB;
                    }
                    return a.name.localeCompare(b.name, 'pt-BR');
                });
        }
    }, [students, drilledSerie, isLoading]);

    const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';
    
    if (isLoading) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
                <p>Não há dados de alunos para exibir o gráfico.</p>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart 
                data={data}
                onDoubleClick={handleBarClick}
                margin={{ top: 20, right: 20, left: 0, bottom: drilledSerie ? 5 : 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={resolvedTheme === 'dark' ? 0.1 : 0.2} />
                <XAxis 
                    dataKey="name" 
                    stroke={tickColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={drilledSerie ? 0 : -90}
                    textAnchor={drilledSerie ? 'middle' : 'end'}
                    dy={drilledSerie ? 0 : 5}
                    height={drilledSerie ? 15 : 75}
                />
                <YAxis 
                    stroke={tickColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    width={30}
                />
                <Tooltip 
                     cursor={{ fill: 'hsl(var(--accent))' }}
                     contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                     }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                
                <Bar dataKey="Capacidade" fill="hsl(var(--chart-2) / 0.6)" radius={[4, 4, 0, 0]} />

                <Bar dataKey="Matriculados" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="Matriculados" 
                        position="top" 
                        content={<CustomLabel theme={resolvedTheme} />} 
                    />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
