
'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
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

const CustomLabel = (props: any) => {
    const { x, y, width, value, theme } = props;
    const tickColor = theme === 'dark' ? '#ffffff' : '#000000';
    return (
        <text x={x + width / 2} y={y} dy={-4} fill={tickColor} fontSize={12} textAnchor="middle">
            {value}
        </text>
    );
};

export default function StudentDistributionChart({ students, onDrilldown, drilledSerie }: StudentDistributionChartProps) {
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
        if (!students) return [];

        if (drilledSerie) {
            const filteredStudents = students.filter(s => s.serie === drilledSerie);
            const classCount = filteredStudents.reduce((acc, student) => {
                const key = `${student.classe || 'N/C'} - ${student.turno || 'N/T'}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as { [key: string]: number });

            return Object.keys(classCount)
                .map(className => ({
                    name: className,
                    Alunos: classCount[className],
                }))
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        } else {
             const seriesCount = students
                .filter(student => student.serie) // Filtra alunos sem série definida
                .reduce((acc, student) => {
                    const serie = student.serie;
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
                     formatter={(value: number) => [`${value} Alunos`, 'Total']}
                />
                <Bar dataKey="Alunos" radius={[4, 4, 0, 0]}>
                    {drilledSerie && (
                        <LabelList 
                            dataKey="Alunos" 
                            position="top" 
                            content={<CustomLabel theme={resolvedTheme} />} 
                        />
                    )}
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
