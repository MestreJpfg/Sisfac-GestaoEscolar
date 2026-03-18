
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, UserMinus, ArrowRightLeft, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function ClassEditManager() {
    const firestore = useFirestore();
    const { toast } = useToast();

    // Filtros de busca de turma
    const [filters, setFilters] = useState({ ensino: '', serie: '', classe: '', turno: '' });
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [studentsInClass, setStudentsInClass] = useState<any[]>([]);

    // Estados para diálogos
    const [transferringStudent, setTransferringStudent] = useState<any | null>(null);
    const [movingStudent, setMovingStudent] = useState<any | null>(null);
    const [newClassInfo, setNewClassInfo] = useState({ serie: '', classe: '', turno: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingData(true);
            try {
                const q = query(collection(firestore, "alunos"));
                const querySnapshot = await getDocs(q);
                const studentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studentsData);
            } catch (error) {
                console.error("Erro ao carregar alunos:", error);
                toast({ variant: "destructive", title: "Erro ao carregar dados" });
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchStudents();
    }, [firestore, toast]);

    const uniqueOptions = useMemo(() => {
        if (!allStudents) return { ensinos: [], series: [], classes: [], turnos: [] };
        const getUniqueValues = (key: string, data: any[]) =>
            [...new Set(data.map(s => s[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR', { numeric: true }));

        let filtered = allStudents;
        const ensinos = getUniqueValues('ensino', filtered);
        if (filters.ensino) filtered = filtered.filter(s => s.ensino === filters.ensino);
        const series = getUniqueValues('serie', filtered);
        if (filters.serie) filtered = filtered.filter(s => s.serie === filters.serie);
        const classes = getUniqueValues('classe', filtered);
        if (filters.classe) filtered = filtered.filter(s => s.classe === filters.classe);
        const turnos = getUniqueValues('turno', filtered);

        return { ensinos, series, classes, turnos };
    }, [allStudents, filters]);

    const isClassSelected = filters.ensino && filters.serie && filters.classe && filters.turno;

    useEffect(() => {
        if (isClassSelected) {
            const filtered = allStudents.filter(s => 
                s.ensino === filters.ensino &&
                s.serie === filters.serie &&
                s.classe === filters.classe &&
                s.turno === filters.turno
            ).sort((a, b) => a.nome.localeCompare(b.nome));
            setStudentsInClass(filtered);
        } else {
            setStudentsInClass([]);
        }
    }, [isClassSelected, filters, allStudents]);

    const handleTransfer = async () => {
        if (!firestore || !transferringStudent) return;
        setIsSaving(true);

        try {
            const studentId = transferringStudent.id;
            const studentRef = doc(firestore, 'alunos', studentId);
            const exRef = doc(firestore, 'exalunos', studentId);

            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
                const data = studentSnap.data();
                setDocumentNonBlocking(exRef, { ...data, status: 'TRANSFERIDO', updatedAt: new Date().toISOString() }, { merge: true });
                deleteDocumentNonBlocking(studentRef);

                setAllStudents(prev => prev.filter(s => s.id !== studentId));
                toast({ title: "Aluno Transferido", description: `${transferringStudent.nome} foi movido para a base de ex-alunos.` });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro na transferência" });
        } finally {
            setIsSaving(false);
            setTransferringStudent(null);
        }
    };

    const handleMove = async () => {
        if (!firestore || !movingStudent) return;
        setIsSaving(true);

        try {
            const studentRef = doc(firestore, 'alunos', movingStudent.id);
            const updatedData = {
                serie: newClassInfo.serie.toUpperCase(),
                classe: newClassInfo.classe.toUpperCase(),
                turno: newClassInfo.turno.toUpperCase(),
                updatedAt: new Date().toISOString()
            };

            setDocumentNonBlocking(studentRef, updatedData, { merge: true });
            
            setAllStudents(prev => prev.map(s => s.id === movingStudent.id ? { ...s, ...updatedData } : s));
            toast({ title: "Turma Atualizada", description: `${movingStudent.nome} foi remanejado com sucesso.` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao mover aluno" });
        } finally {
            setIsSaving(false);
            setMovingStudent(null);
        }
    };

    const openMoveDialog = (student: any) => {
        setMovingStudent(student);
        setNewClassInfo({ serie: student.serie, classe: student.classe, turno: student.turno });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Turma para Edição</CardTitle>
                    <CardDescription>Escolha uma turma para listar os alunos e realizar remanejamentos ou transferências.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingData ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Select value={filters.ensino} onValueChange={v => setFilters({ ...filters, ensino: v, serie: '', classe: '', turno: '' })}>
                                <SelectTrigger><SelectValue placeholder="Ensino..." /></SelectTrigger>
                                <SelectContent>{uniqueOptions.ensinos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.serie} onValueChange={v => setFilters({ ...filters, serie: v, classe: '', turno: '' })} disabled={!filters.ensino}>
                                <SelectTrigger><SelectValue placeholder="Série..." /></SelectTrigger>
                                <SelectContent>{uniqueOptions.series.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.classe} onValueChange={v => setFilters({ ...filters, classe: v, turno: '' })} disabled={!filters.serie}>
                                <SelectTrigger><SelectValue placeholder="Classe..." /></SelectTrigger>
                                <SelectContent>{uniqueOptions.classes.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                            <Select value={filters.turno} onValueChange={v => setFilters({ ...filters, turno: v })} disabled={!filters.classe}>
                                <SelectTrigger><SelectValue placeholder="Turno..." /></SelectTrigger>
                                <SelectContent>{uniqueOptions.turnos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isClassSelected ? (
                <Card className="animate-in fade-in slide-in-from-bottom-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Alunos da Turma</CardTitle>
                            <CardDescription>{studentsInClass.length} alunos encontrados em {filters.serie} {filters.classe} ({filters.turno})</CardDescription>
                        </div>
                        <Users className="h-8 w-8 text-muted-foreground opacity-20" />
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome do Aluno</TableHead>
                                        <TableHead className="hidden sm:table-cell">RM</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentsInClass.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium">{student.nome}</TableCell>
                                            <TableCell className="hidden sm:table-cell text-muted-foreground">{student.rm}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => openMoveDialog(student)}>
                                                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                                                        Remanejar
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => setTransferringStudent(student)}>
                                                        <UserMinus className="h-4 w-4 mr-2" />
                                                        Transferir
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p>Selecione uma turma para começar a editar os alunos.</p>
                </div>
            )}

            {/* Diálogo de Remanejamento */}
            <Dialog open={!!movingStudent} onOpenChange={() => !isSaving && setMovingStudent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Turma do Aluno</DialogTitle>
                        <DialogDescription>Mude a série, classe ou turno de <strong>{movingStudent?.nome}</strong>.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Série / Ano</Label>
                            <Input value={newClassInfo.serie} onChange={e => setNewClassInfo({...newClassInfo, serie: e.target.value})} placeholder="Ex: 5º ANO" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Classe / Turma</Label>
                            <Input value={newClassInfo.classe} onChange={e => setNewClassInfo({...newClassInfo, classe: e.target.value})} placeholder="Ex: A" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Turno</Label>
                            <Input value={newClassInfo.turno} onChange={e => setNewClassInfo({...newClassInfo, turno: e.target.value})} placeholder="Ex: MANHÃ" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMovingStudent(null)} disabled={isSaving}>Cancelar</Button>
                        <Button onClick={handleMove} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Salvar Alteração
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta de Transferência */}
            <AlertDialog open={!!transferringStudent} onOpenChange={() => setTransferringStudent(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Confirmar Transferência?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja marcar <strong>{transferringStudent?.nome}</strong> como transferido(a)? 
                            Ele(a) será movido para a base de dados de ex-alunos e deixará de aparecer nas chamadas e listagens ativas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleTransfer} className="bg-destructive hover:bg-destructive/90" disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Confirmar Transferência"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
