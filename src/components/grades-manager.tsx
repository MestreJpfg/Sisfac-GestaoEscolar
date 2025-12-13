

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Users, NotebookPen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { disciplinas as availableDisciplines } from '@/lib/disciplinas.json';

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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());


    // Data
    const [grades, setGrades] = useState<Grades>({});
    const [isSaving, setIsSaving] = useState(false);

    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
    }, []);


    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingOptions(true);
            try {
                const q = query(collection(firestore, "alunos"));
                const querySnapshot = await getDocs(q);
                const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students for filters:", error);
                toast({ variant: "destructive", title: "Erro ao Carregar Alunos" });
            } finally {
                setIsLoadingOptions(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);
    
    // Derived unique options for filters
    const uniqueFilterOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [] };
        
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
        
        return { ensinos, series, classes, turnos };
    }, [allStudents, filters]);
    
    const isReadyToLoad = useMemo(() => {
        return filters.ensino && filters.serie && filters.classe && filters.turno && selectedDiscipline && selectedYear;
    }, [filters, selectedDiscipline, selectedYear]);


    useEffect(() => {
        if (isReadyToLoad && allStudents.length > 0) {
            setIsLoadingStudents(true);
            const filtered = allStudents.filter(s => 
                s.ensino === filters.ensino &&
                s.serie === filters.serie &&
                s.classe === filters.classe &&
                s.turno === filters.turno
            ).sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            setStudentsInClass(filtered);
            setIsLoadingStudents(false);
        } else {
            setStudentsInClass([]);
        }
    }, [isReadyToLoad, filters, allStudents]);

    const sortedStudentsInClass = studentsInClass;


    const disciplineId = useMemo(() => {
        if (!selectedDiscipline) return '';
        // This logic ensures that names like "Língua Portuguesa" become "língua_portuguesa"
        // and names like "Educação Física" become "educação_física".
        return selectedDiscipline
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_');
      }, [selectedDiscipline]);

    useEffect(() => {
        if (sortedStudentsInClass.length > 0 && disciplineId && selectedYear) {
            const newGrades: Grades = {};
            sortedStudentsInClass.forEach(student => {
                const disciplineGrades = student.boletim?.[selectedYear]?.notas?.[disciplineId];
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
    }, [sortedStudentsInClass, disciplineId, selectedYear]);

    const handleFilterChange = (name: string, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            if (name === 'ensino') { newFilters.serie = ''; newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'serie') { newFilters.classe = ''; newFilters.turno = ''; }
            else if (name === 'classe') { newFilters.turno = ''; }
            return newFilters;
        });
        // Do not reset discipline when only class/turno changes
        if (['ensino', 'serie'].includes(name)) {
            setSelectedDiscipline('');
        }
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
        if (!firestore || !sortedStudentsInClass || !disciplineId || !selectedYear || Object.keys(grades).length === 0) return;
    
        setIsSaving(true);
        
        try {
            const batch = writeBatch(firestore);
            
            for (const student of sortedStudentsInClass) {
                const studentId = student.id;
                const studentDocRef = doc(firestore, 'alunos', studentId);
                const studentGrades = grades[studentId];
                if (!studentGrades) continue;

                // Create a deep copy of the student's existing boletim or an empty object
                const studentData = (await getDoc(studentDocRef)).data();
                const boletim = JSON.parse(JSON.stringify(studentData?.boletim || {}));

                // Ensure the structure for the current year exists
                if (!boletim[selectedYear]) {
                    boletim[selectedYear] = { info: {}, notas: {} };
                }
                if (!boletim[selectedYear].info) {
                    boletim[selectedYear].info = {};
                }
                if (!boletim[selectedYear].notas) {
                    boletim[selectedYear].notas = {};
                }
                if (!boletim[selectedYear].notas[disciplineId]) {
                    boletim[selectedYear].notas[disciplineId] = {};
                }

                // Update info for the year
                boletim[selectedYear].info.serie = student.serie;
                boletim[selectedYear].info.classe = student.classe;
                boletim[selectedYear].info.turno = student.turno;

                // Update grades for the discipline
                boletim[selectedYear].notas[disciplineId].etapa1 = studentGrades.etapa1;
                boletim[selectedYear].notas[disciplineId].etapa2 = studentGrades.etapa2;
                boletim[selectedYear].notas[disciplineId].etapa3 = studentGrades.etapa3;
                boletim[selectedYear].notas[disciplineId].etapa4 = studentGrades.etapa4;

                // Calculate and update average
                const validGrades = Object.values(studentGrades).filter((nota): nota is number => nota !== null && nota !== undefined && !isNaN(nota));
                const average = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b, 0) / validGrades.length : null;
                boletim[selectedYear].notas[disciplineId].mediaFinal = average !== null ? parseFloat(average.toFixed(1)) : null;
    
                batch.set(studentDocRef, { boletim }, { merge: true });
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
                    <CardTitle>Lançamento de Notas</CardTitle>
                    <CardDescription>Escolha os filtros para lançar as notas de uma turma específica.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingOptions ? (
                        <div className="flex items-center justify-center h-24">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                             <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger><SelectValue placeholder="Ano Letivo..." /></SelectTrigger>
                                <SelectContent>
                                    {availableYears.map(y => <SelectItem key={y} value={y}>Ano de {y}</SelectItem>)}
                                </SelectContent>
                            </Select>
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
                                    {availableDisciplines.map(d => 
                                        <SelectItem key={d} value={d}>{d}</SelectItem>
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
                ) : sortedStudentsInClass && sortedStudentsInClass.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Lançamento de Notas: <span className="text-primary">{selectedDiscipline} ({selectedYear})</span></CardTitle>
                            <CardDescription>
                                Insira as notas para todas as etapas. A média final será calculada automaticamente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {/* Mobile View */}
                            <div className="space-y-4 sm:hidden">
                                {sortedStudentsInClass.map((student) => (
                                    <div key={student.id} className="p-4 border rounded-lg">
                                        <p className="font-semibold mb-3">{student.nome}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(['etapa1', 'etapa2', 'etapa3', 'etapa4'] as const).map(etapa => (
                                                <div key={etapa}>
                                                    <label className="text-sm text-muted-foreground">{etapa.replace('etapa', 'Etapa ')}</label>
                                                    <Input
                                                        type="text"
                                                        value={grades[student.id]?.[etapa] === null || grades[student.id]?.[etapa] === undefined ? '' : String(grades[student.id]?.[etapa]).replace('.', ',')}
                                                        onChange={(e) => handleGradeChange(student.id, etapa, e.target.value)}
                                                        className="w-full text-center mt-1"
                                                        placeholder="-"
                                                    />
                                                </div>
                                            ))}
                                            <div>
                                                 <label className="text-sm text-muted-foreground">Média Final</label>
                                                 <p className="font-bold text-lg mt-1 h-10 flex items-center justify-center">{calculateAverage(student.id)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                             {/* Desktop View */}
                            <div className="overflow-x-auto hidden sm:block">
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
                                        {sortedStudentsInClass.map((student) => (
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
