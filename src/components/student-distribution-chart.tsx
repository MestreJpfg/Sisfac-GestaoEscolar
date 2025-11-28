
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

interface StudentDistributionChartProps {
    students: any[];
}

export default function StudentDistributionChart({ students }: StudentDistributionChartProps) {
    const { theme } = useTheme();

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
                // Tenta extrair um número do nome da série para uma ordenação mais natural
                const matchA = a.name.match(/\d+/);
                const matchB = b.name.match(/\d+/);
                if (matchA && matchB) {
                    return parseInt(matchA[0]) - parseInt(matchB[0]);
                }
                // Fallback para ordenação alfabética
                return a.name.localeCompare(b.name);
            });
    }, [students]);
    
    // Determine colors based on the current theme
    const tickColor = theme === 'dark' ? '#a1a1aa' : '#71717a'; // zinc-400 / zinc-500
    const barColor = theme === 'dark' ? 'hsl(var(--primary))' : 'hsl(var(--primary))';


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
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
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
                />
                <Tooltip 
                     contentStyle={{
                        backgroundColor: theme === 'dark' ? 'hsl(var(--background))' : 'white',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                     }}
                />
                <Legend />
                <Bar dataKey="Alunos" fill={barColor} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

