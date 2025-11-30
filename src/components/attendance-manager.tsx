
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, UserCheck, UserX, User, Save, Users } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

type AttendanceStatus = 'Presente' | 'Ausente' | 'Justificado';

interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status: AttendanceStatus;
}

export default function AttendanceManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [filters, setFilters] = useState({
        ensino: '',
        serie: '',
        classe: '',
        turno: '',
    });
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [attendance, setAttendance] = useState<Map<string, AttendanceStatus>>(new Map());
    const [isSaving, setIsSaving] = useState(false);

    // Query to get all students for filter options
    const studentsOptionsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'alunos'));
    }, [firestore]);
    const { data: allStudents, isLoading: isLoadingOptions } = useCollection(studentsOptionsQuery);
    
    // Derived unique options for filters, now dependent on other filters
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
    
    const isClassSelected = useMemo(() => {
        return filters.ensino && filters.serie && filters.classe && filters.turno;
    }, [filters]);

    const classId = useMemo(() => {
        if (!isClassSelected) return null;
        return `${filters.ensino}-${filters.serie}-${filters.classe}-${filters.turno}`.replace(/\s+/g, '_');
    }, [isClassSelected, filters]);

    // Query for students in the selected class
    const studentsInClassQuery = useMemoFirebase(() => {
        if (!firestore || !isClassSelected) return null;
        let q = query(collection(firestore, 'alunos'));
        q = query(q, where('ensino', '==', filters.ensino));
        q = query(q, where('serie', '==', filters.serie));
        q = query(q, where('classe', '==', filters.classe));
        q = query(q, where('turno', '==', filters.turno));
        return q;
    }, [firestore, isClassSelected, filters.ensino, filters.serie, filters.classe, filters.turno]);
    const { data: studentsInClass, isLoading: isLoadingStudents } = useCollection(studentsInClassQuery);

    const sortedStudentsInClass = useMemo(() => {
        return studentsInClass?.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')) || [];
    }, [studentsInClass]);


    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance(prev => new Map(prev).set(studentId, status));
    };

    // Effect to fetch existing attendance for the selected date and class
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!firestore || !classId || !selectedDate || !sortedStudentsInClass || sortedStudentsInClass.length === 0) return;

            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            const attendanceQuery = query(
                collection(firestore, 'attendance'),
                where('classId', '==', classId),
                where('date', '==', formattedDate)
            );
            
            const snapshot = await getDocs(attendanceQuery);
            const existingAttendance = new Map<string, AttendanceStatus>();
            snapshot.forEach(doc => {
                const data = doc.data() as AttendanceRecord;
                existingAttendance.set(data.studentId, data.status);
            });
            
            const newAttendance = new Map<string, AttendanceStatus>();
            sortedStudentsInClass.forEach(student => {
                newAttendance.set(student.id, existingAttendance.get(student.id) || 'Presente');
            });
            setAttendance(newAttendance);
        };
        fetchAttendance();
    }, [firestore, classId, selectedDate, sortedStudentsInClass]);

    const handleFilterChange = (name: string, value: string) => {
        const newValue = value === 'all' ? '' : value;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: newValue };
            // Reset dependent filters when a parent filter changes
            if (name === 'ensino') {
                newFilters.serie = '';
                newFilters.classe = '';
                newFilters.turno = '';
            } else if (name === 'serie') {
                newFilters.classe = '';
                newFilters.turno = '';
            } else if (name === 'classe') {
                newFilters.turno = '';
            }
            return newFilters;
        });
    };

    const handleSaveAttendance = async () => {
        if (!firestore || !classId || !selectedDate || attendance.size === 0) return;
    
        setIsSaving(true);
        const batch = writeBatch(firestore);
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    
        attendance.forEach((status, studentId) => {
            const attendanceId = `${studentId}_${formattedDate}`;
            const docRef = doc(firestore, 'attendance', attendanceId);
    
            if (status === 'Ausente' || status === 'Justificado') {
                // Create or update records for absent or justified students
                const record: AttendanceRecord = {
                    id: attendanceId,
                    studentId,
                    classId,
                    date: formattedDate,
                    status,
                };
                batch.set(docRef, record);
            } else { // status === 'Presente'
                // If the student is present, delete any existing non-present record for that day.
                // This handles the case where a student was marked absent and then changed to present.
                batch.delete(docRef);
            }
        });
    
        try {
            await batch.commit();
            toast({
                title: "Frequência Salva!",
                description: `A lista de chamada para ${format(selectedDate, 'dd/MM/yyyy')} foi salva com sucesso.`,
            });
        } catch (error) {
            console.error("Error saving attendance:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: "Não foi possível salvar a frequência. Tente novamente.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const counts = useMemo(() => {
        const statusCounts = { Presente: 0, Ausente: 0, Justificado: 0 };
        attendance.forEach(status => {
            statusCounts[status]++;
        });
        return statusCounts;
    }, [attendance]);


    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Turma e Data</CardTitle>
                    <CardDescription>Escolha uma turma e uma data para registar ou visualizar a frequência.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                            <Select value={filters.serie} onValueChange={(v) => handleFilterChange('serie', v)} disabled={!filters.ensino || uniqueFilterOptions.series.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={(v) => handleFilterChange('classe', v)} disabled={!filters.serie || uniqueFilterOptions.classes.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={(v) => handleFilterChange('turno', v)} disabled={!filters.classe || uniqueFilterOptions.turnos.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                                <SelectContent>{uniqueFilterOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus disabled={(date) => date > new Date()} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isClassSelected ? (
                isLoadingStudents ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : sortedStudentsInClass && sortedStudentsInClass.length > 0 ? (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <CardTitle>Lista de Chamada</CardTitle>
                                    <CardDescription>
                                        Turma: {filters.serie} {filters.classe} ({filters.turno}) - {format(selectedDate!, 'dd/MM/yyyy', { locale: ptBR })}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium">
                                    <span className="flex items-center gap-1 text-green-600"><UserCheck size={16}/> Presentes: {counts.Presente}</span>
                                    <span className="flex items-center gap-1 text-red-600"><UserX size={16}/> Ausentes: {counts.Ausente}</span>
                                    <span className="flex items-center gap-1 text-yellow-600"><User size={16}/> Justificados: {counts.Justificado}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {sortedStudentsInClass.map((student) => (
                                    <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border rounded-md hover:bg-muted/50 transition-colors">
                                        <span className="font-medium mb-3 sm:mb-0">{student.nome}</span>
                                        <RadioGroup
                                            value={attendance.get(student.id) || 'Presente'}
                                            onValueChange={(value) => handleStatusChange(student.id, value as AttendanceStatus)}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Presente" id={`presente-${student.id}`} />
                                                <Label htmlFor={`presente-${student.id}`} className="text-green-600 cursor-pointer">Presente</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Ausente" id={`ausente-${student.id}`} />
                                                <Label htmlFor={`ausente-${student.id}`} className="text-red-600 cursor-pointer">Ausente</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Justificado" id={`justificado-${student.id}`} />
                                                <Label htmlFor={`justificado-${student.id}`} className="text-yellow-600 cursor-pointer">Justificado</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex justify-end">
                                <Button onClick={handleSaveAttendance} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar Frequência
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
                                Não foram encontrados alunos para a turma selecionada.
                            </p>
                        </CardContent>
                    </Card>
                )
            ) : (
                <Card>
                    <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium text-foreground">Nenhuma Turma Selecionada</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Por favor, preencha todos os filtros para carregar a lista de alunos.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
