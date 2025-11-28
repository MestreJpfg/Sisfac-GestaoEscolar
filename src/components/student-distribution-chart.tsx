
'use client';

import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from 'next-themes';

interface StudentDistributionChartProps {
    students: any[];
    onDrilldown: (serie: string | null) => void;
    drilledSerie: string | null;
}

const getSeriesNumber = (name: string): number => {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[0], 10) : Infinity;
};

export default function StudentDistributionChart({ students, onDrilldown, drilledSerie }: StudentDistributionChartProps) {
    const { resolvedTheme } = useTheme();

    const handleBarClick = (payload: any) => {
        if (payload && payload.activePayload && payload.activePayload[0]) {
            const serieName = payload.activePayload[0].payload.originalName || payload.activePayload[0].payload.name;
            if (!drilledSerie) {
                onDrilldown(serieName);
            }
        }
    };
    
    const data = useMemo(() => {
        if (!students) return [];

        if (drilledSerie) {
            const filteredStudents = students.filter(s => s.serie === drilledSerie);
            const classCount = filteredStudents.reduce((acc, student) => {
                const key = `${student.classe || 'N/C'} - ${student.turno || 'N/T'}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            return Object.keys(classCount)
                .map(className => {
                    const count = classCount[className];
                    return {
                        name: `${className} (${count} Alunos)`,
                        originalName: className,
                        Alunos: count,
                    };
                })
                .sort((a, b) => a.originalName.localeCompare(b.originalName, 'pt-BR'));

        } else {
             const seriesCount = students.reduce((acc, student) => {
                const serie = student.serie || 'Não definida';
                acc[serie] = (acc[serie] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            return Object.keys(seriesCount)
                .map(serie => ({
                    name: serie,
                    Alunos: seriesCount[serie],
                }))
                .sort((a, b) => {
                    const numA = getSeriesNumber(a.name);
                    const numB = getSeriesNumber(b.name);
                    
                    if (numA !== Infinity && numB !== Infinity) {
                        return numA - numB;
                    }
                    return a.name.localeCompare(b.name, 'pt-BR');
                });
        }
    }, [students, drilledSerie]);

    const chartColors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];

    const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';

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
            >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={resolvedTheme === 'dark' ? 0.1 : 0.2} />
                <XAxis 
                    dataKey="name" 
                    stroke={tickColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
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
                <Bar dataKey="Alunos" radius={[4, 4, 0, 0]}>
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={chartColors[index % chartColors.length]}
                            className={!drilledSerie ? 'cursor-pointer' : ''}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
