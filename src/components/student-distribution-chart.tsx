
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from 'next-themes';

interface StudentDistributionChartProps {
    students: any[];
}

// Extrai o número do início de uma string para ordenação (ex: "1º Ano" -> 1)
const getSeriesNumber = (name: string): number => {
    const match = name.match(/^(\d+)/);
    return match ? parseInt(match[0], 10) : Infinity;
};

export default function StudentDistributionChart({ students }: StudentDistributionChartProps) {
    const { resolvedTheme } = useTheme();

    const data = useMemo(() => {
        if (!students) return [];

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
    }, [students]);
    
    // Cores do tema para o gráfico
    const chartColors = [
        'hsl(var(--chart-1))',
        'hsl(var(--chart-2))',
        'hsl(var(--chart-3))',
        'hsl(var(--chart-4))',
        'hsl(var(--chart-5))',
    ];

    const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a'; // zinc-400 / zinc-500

    if (data.length === 0) {
        return (
            <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
                <p>Não há dados de alunos para exibir o gráfico.</p>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={resolvedTheme === 'dark' ? 0.1 : 0.2} />
                <XAxis 
                    dataKey="name" 
                    stroke={tickColor}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
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
                        <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
