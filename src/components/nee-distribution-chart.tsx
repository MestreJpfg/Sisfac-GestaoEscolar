
'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface NeeDistributionChartProps {
    students: any[];
    isLoading: boolean;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export default function NeeDistributionChart({ students, isLoading }: NeeDistributionChartProps) {
    const { resolvedTheme } = useTheme();

    const data = useMemo(() => {
        if (!students) return [];

        const neeCount = students.filter(s => s.nee && s.nee.trim() !== '').length;
        const totalStudents = students.length;
        const nonNeeCount = totalStudents - neeCount;

        if (totalStudents === 0) return [];

        return [
            { name: 'Alunos com NEE', value: neeCount },
            { name: 'Alunos sem NEE', value: nonNeeCount },
        ];
    }, [students]);
    
    const COLORS = [
        'hsl(var(--chart-2))', // Cor para NEE
        'hsl(var(--chart-1))', // Cor para sem NEE
    ];
    
    const tickColor = resolvedTheme === 'dark' ? '#a1a1aa' : '#71717a';

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Distribuição de NEE</CardTitle>
                    <CardDescription>Proporção de alunos com necessidades especiais.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex h-[350px] w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Distribuição de NEE</CardTitle>
                <CardDescription>Proporção de alunos com necessidades especiais.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Tooltip
                                 cursor={{ fill: 'hsl(var(--accent))' }}
                                 contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)',
                                 }}
                            />
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                innerRadius={60}
                                outerRadius={110}
                                fill="#8884d8"
                                dataKey="value"
                                strokeWidth={2}
                                stroke={'hsl(var(--background))'}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend wrapperStyle={{ fontSize: '14px' }}/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-[350px] w-full items-center justify-center text-muted-foreground">
                        <p>Não há dados de alunos para exibir o gráfico.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
