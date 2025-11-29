'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, doc, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Users, NotebookPen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type EtapaGrade = {
    etapa1?: number | null;
    etapa2?: number | null;
    etapa3?: number | null;
    etapa4?: number | null;
};
type Grades = { [studentId: string]: EtapaGrade };

export default function GradesManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    // Filters
    const [filters, setFilters] = useState({
        ensino: '',
        serie: '',
        classe: '',
        turno: '',
    });
    const [selectedDiscipline, setSelectedDiscipline] = useState('');

    // Data
    const [grades, setGrades] = useState<Grades>({});
    const [isSaving, setIsSaving] = useState(false);

    // Query for all students (for filter options)
    const studentsOptionsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'alunos'), orderBy('nome'));
    }, [firestore]);
    const { data: allStudents, isLoading: isLoadingOptions } = useCollection(studentsOptionsQuery);
    
    // Derived unique options for filters
    const uniqueFilterOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [], disciplines: [] };
        
        const getUniqueValues = (key: string, data: any[]) =>
            [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

        let filteredForOptions = allStudents;
        const ensinos = getUniqueValues('ensino', filteredForOptions);

        if(filters.ensino) filteredForOptions = filteredForOptions.filter(s => s.ensino === filters.ensino);
        const series = getUniqueValues('serie', filteredForOptions);

        if(filters.serie) filteredForOptions = filteredForOptions.filter(s => s.serie === filters.serie);
        const classes = getUniqueValues('classe', filteredForOptions);
        
        if(filters.classe) filteredForOptions = filteredForOptions.filter(s => s.classe === filters.classe);
        const turnos = getUniqueValues('turno', filteredForOptions);

        const disciplines = [...new Set(allStudents.flatMap(s => s.boletim ? Object.keys(s.boletim) : []))]
            .map(d => d.replace(/_/g, ' ').replace(/-/g, '/'))
            .sort((a, b) => a.localeCompare(b));
        
        return { ensinos, series, classes, turnos, disciplines };
    }, [allStudents, filters]);
    
    const isReadyToLoad = useMemo(() => {
        return filters.ensino && filters.serie && filters.classe && filters.turno && selectedDiscipline;
    }, [filters, selectedDiscipline]);

    // Query for students in the selected class
    const studentsInClassQuery = useMemo(() => {
        if (!firestore || !isReadyToLoad) return null;
        let q = query(collection(firestore, 'alunos'), orderBy('nome'));
        q = query(q, where('ensino', '==', filters.ensino));
        q = query(q, where('serie', '==', filters.serie));
        q = query(q, where('classe', '==', filters.classe));
        q = query(q, where('turno', '==', filters.turno));
        return q;
    }, [firestore, isReadyToLoad, filters]);
    const { data: studentsInClass, isLoading: isLoadingStudents } = useCollection(studentsInClassQuery);

    const disciplineId = useMemo(() => {
        return selectedDiscipline.trim().replace(/\s+/g, '_').toLowerCase();
    }, [selectedDiscipline]);

    useEffect(() => {
        if (studentsInClass && disciplineId) {
            const newGrades: Grades = {};
            studentsInClass.forEach(student => {
                const disciplineGrades = student.boletim?.[disciplineId];
                newGrades[student.id] = {
                    etapa1: disciplineGrades?.etapa1 ?? null,
                    etapa2: disciplineGrades?.etapa2 ?? null,
                    etapa3: disciplineGrades?.etapa3 ?? null,
                    etapa4: disciplineGrades?.etapa4 ?? null,
                };
            });
            setGrades(newGrades);
        } else {
            setGrades({});
        }
    }, [studentsInClass, disciplineId]);

    const handleFilterChange = (name: string, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { newFilters.serie = ''; newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'serie') { newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'classe') { newFilters.turno = ''; }
            return newFilters;
        });
        setSelectedDiscipline('');
    };

    const handleGradeChange = (studentId: string, etapa: keyof EtapaGrade, value: string) => {
        const numericValue = value === '' ? null : parseFloat(value.replace(',', '.'));
        if (value !== '' && (isNaN(numericValue!) || numericValue! < 0 || numericValue! > 10)) {
            toast({
                variant: 'destructive',
                title: 'Nota Inválida',
                description: 'A nota deve ser um número entre 0 e 10.',
            });
            return;
        }
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [etapa]: numericValue,
            }
        }));
    };
    
    const calculateAverage = (studentId: string): string => {
        const studentGrades = grades[studentId];
        if (!studentGrades) return '-';

        const validGrades = Object.values(studentGrades).filter(
            (nota): nota is number => nota !== null && nota !== undefined && !isNaN(nota)
        );

        if (validGrades.length === 0) return '-';

        const average = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
        return average.toFixed(1).replace('.', ',');
    };


    const handleSaveChanges = async () => {
        if (!firestore || !studentsInClass || !disciplineId || Object.keys(grades).length === 0) return;
    
        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);
            
            for (const student of studentsInClass) {
                const studentId = student.id;
                const studentDocRef = doc(firestore, 'alunos', studentId);
                const studentGrades = grades[studentId];
                if (!studentGrades) continue;

                const validGrades = Object.values(studentGrades).filter((nota): nota is number => nota !== null && nota !== undefined && !isNaN(nota));
                const average = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null;

                const updatePayload: { [key: string]: any } = {
                    [`boletim.${disciplineId}.etapa1`]: studentGrades.etapa1,
                    [`boletim.${disciplineId}.etapa2`]: studentGrades.etapa2,
                    [`boletim.${disciplineId}.etapa3`]: studentGrades.etapa3,
                    [`boletim.${disciplineId}.etapa4`]: studentGrades.etapa4,
                    [`boletim.${disciplineId}.mediaFinal`]: average,
                };
    
                batch.update(studentDocRef, updatePayload);
            }
            
            await batch.commit();
    
            toast({
                title: "Notas Salvas!",
                description: "As notas e as médias foram atualizadas com sucesso.",
            });
        } catch (error) {
            console.error("Error saving grades:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível salvar as notas. Verifique se possui permissão e tente novamente.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Turma e Disciplina</CardTitle>
                    <CardDescription>Escolha os filtros para lançar as notas de uma turma específica.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingOptions ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Select value={filters.ensino} onValueChange={(v) => handleFilterChange('ensino', v)}>
                                <SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={(v) => handleFilterChange('serie', v)} disabled={!filters.ensino}>
                                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={(v) => handleFilterChange('classe', v)} disabled={!filters.serie}>
                                <SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(v) => handleFilterChange('turno', v)} disabled={!filters.classe}>
                                <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                             <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline} disabled={!filters.turno}>
                                <SelectTrigger><SelectValue placeholder="Disciplina..." /></SelectTrigger>
                                <SelectContent>
                                    {uniqueFilterOptions.disciplines.map(d => 
                                        <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isReadyToLoad ? (
                isLoadingStudents ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : studentsInClass && studentsInClass.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Lançamento de Notas: <span className="text-primary">{selectedDiscipline}</span></CardTitle>
                            <CardDescription>
                                Insira as notas para todas as etapas. A média final será calculada automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                               <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[30%] min-w-[200px] sticky left-0 bg-background z-10">Aluno</TableHead>
                                            <TableHead className="text-center">Etapa 1</TableHead>
                                            <TableHead className="text-center">Etapa 2</TableHead>
                                            <TableHead className="text-center">Etapa 3</TableHead>
                                            <TableHead className="text-center">Etapa 4</TableHead>
                                            <TableHead className="text-center font-bold sticky right-0 bg-background z-10">Média Final</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentsInClass.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell className="font-medium sticky left-0 bg-background z-10">{student.nome}</TableCell>
                                                {(['etapa1', 'etapa2', 'etapa3', 'etapa4'] as const).map(etapa => (
                                                    <TableCell key={etapa} className="text-center">
                                                        <Input
                                                            type="text"
                                                            value={grades[student.id]?.[etapa] === null || grades[student.id]?.[etapa] === undefined ? '' : String(grades[student.id]?.[etapa]).replace('.', ',')}
                                                            onChange={(e) => handleGradeChange(student.id, etapa, e.target.value)}
                                                            className="w-20 mx-auto text-center"
                                                            placeholder="-"
                                                        />
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center font-bold sticky right-0 bg-background z-10">{calculateAverage(student.id)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Notas
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                     <Card>
                        <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum Aluno na Turma</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Não foram encontrados alunos para os filtros selecionados.
                            </p>
                        </CardContent>
                    </Card>
                )
            ) : (
                <Card>
                    <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                        <NotebookPen className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium text-foreground">Aguardando Seleção</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Por favor, preencha todos os filtros para carregar a lista de lançamento.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
