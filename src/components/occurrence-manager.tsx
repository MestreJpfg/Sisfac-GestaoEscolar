
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, doc, getDoc, setDoc, orderBy, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Loader2, Trash2, Edit, FileText, History, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import OccurrenceFormDialog from './occurrence-form-dialog';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export default function OccurrenceManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingOccurrence, setEditingOccurrence] = useState<any | null>(null);
    const [deletingOccurrence, setDeletingOccurrence] = useState<any | null>(null);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [allStudents, setAllStudents] = useState<any[]>([]);

    // Buscar prontuários de ocorrências. Adicionado limite para garantir performance e evitar loops.
    const occurrencesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'ocorrencias'), 
            orderBy('lastUpdated', 'desc'),
            limit(50)
        );
    }, [firestore]);

    const { data: studentRecords, isLoading: isLoadingOccurrences, error: occurrencesError } = useCollection(occurrencesQuery);

    // Achatar todos os eventos de todos os alunos para uma lista única cronológica para a tabela principal
    const allEventsFlattened = useMemo(() => {
        if (!studentRecords) return [];
        const events: any[] = [];
        studentRecords.forEach(record => {
            if (record.eventos && Array.isArray(record.eventos)) {
                record.eventos.forEach((ev: any) => {
                    events.push({
                        ...ev,
                        studentId: record.id, // O ID é o RM
                        studentName: record.studentName,
                        studentClass: record.studentClass
                    });
                });
            }
        });
        
        return events.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
        });
    }, [studentRecords]);

    // Buscar lista de alunos para o autocomplete do formulário
    useEffect(() => {
        const fetchStudents = async () => {
            if (!firestore) return;
            setIsLoadingStudents(true);
            try {
                const snapshot = await (await import('firebase/firestore')).getDocs(collection(firestore, 'alunos'));
                setAllStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Erro ao buscar alunos:", error);
            } finally {
                setIsLoadingStudents(false);
            }
        };
        fetchStudents();
    }, [firestore]);

    const filteredEvents = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase().trim();
        if (!lowerSearch) return allEventsFlattened;
        
        return allEventsFlattened.filter(occ => 
            occ.studentName?.toLowerCase().includes(lowerSearch) ||
            occ.studentId?.toLowerCase().includes(lowerSearch) ||
            occ.type?.toLowerCase().includes(lowerSearch) ||
            occ.description?.toLowerCase().includes(lowerSearch)
        );
    }, [allEventsFlattened, searchTerm]);

    const handleSave = async (data: any) => {
        if (!firestore) return;

        setIsSaving(true);
        try {
            const studentId = data.studentId; 
            const docRef = doc(firestore, 'ocorrencias', studentId);
            
            const docSnap = await getDoc(docRef);
            let currentEventos = [];
            
            if (docSnap.exists()) {
                currentEventos = docSnap.data().eventos || [];
            }

            const occurrenceId = data.id || `occ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            
            const eventData = {
                ...data,
                id: occurrenceId,
                updatedAt: new Date().toISOString(),
                createdAt: data.createdAt || new Date().toISOString()
            };

            let updatedEventos;
            if (data.id) {
                updatedEventos = currentEventos.map((ev: any) => ev.id === data.id ? eventData : ev);
            } else {
                updatedEventos = [eventData, ...currentEventos];
            }

            const finalDocData = {
                studentId: data.studentId, 
                studentName: data.studentName,
                studentClass: data.studentClass,
                lastUpdated: new Date().toISOString(),
                eventos: updatedEventos
            };

            await setDoc(docRef, finalDocData, { merge: true });

            toast({
                title: data.id ? "Registro Atualizado" : "Ocorrência Registrada",
                description: `O prontuário de ${data.studentName} foi atualizado com sucesso.`,
            });

            setIsFormOpen(false);
            setEditingOccurrence(null);
        } catch (error: any) {
            console.error("Erro ao salvar ocorrência:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível gravar os dados. Verifique a sua conexão.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!firestore || !deletingOccurrence) return;
        try {
            const studentId = deletingOccurrence.studentId;
            const docRef = doc(firestore, 'ocorrencias', studentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const currentData = docSnap.data();
                const filteredEventos = (currentData.eventos || []).filter((ev: any) => ev.id !== deletingOccurrence.id);
                
                await setDoc(docRef, { 
                    ...currentData, 
                    eventos: filteredEventos,
                    lastUpdated: new Date().toISOString()
                });
                
                toast({ title: "Evento removido do histórico." });
            }
        } catch (error) {
            console.error("Erro ao eliminar:", error);
            toast({ variant: 'destructive', title: "Não foi possível remover o registro." });
        } finally {
            setDeletingOccurrence(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Resolvida': return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'Ativa': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'Em Análise': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
            default: return 'bg-secondary text-secondary-foreground';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Pesquisar por aluno, RM, tipo ou descrição..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => { setEditingOccurrence(null); setIsFormOpen(true); }} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Registrar Ocorrência
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        <div>
                            <CardTitle>Histórico de Eventos Disciplinares</CardTitle>
                            <CardDescription>Lista cronológica de todas as ocorrências registradas no sistema.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoadingOccurrences ? (
                        <div className="flex h-64 flex-col items-center justify-center space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">A carregar registros do banco de dados...</p>
                        </div>
                    ) : (occurrencesError) ? (
                        <div className="text-center py-24 text-destructive border-2 border-dashed rounded-lg bg-destructive/5">
                            <AlertCircle className="mx-auto h-16 w-16 mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold">Erro ao Carregar Dados</h3>
                            <p className="max-w-xs mx-auto text-sm opacity-80">
                                Verifique as permissões de acesso ou se há índices em falta no Firebase.
                            </p>
                        </div>
                    ) : filteredEvents.length > 0 ? (
                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[120px]">Data/Hora</TableHead>
                                        <TableHead>Aluno / Turma</TableHead>
                                        <TableHead>Tipo de Falta</TableHead>
                                        <TableHead className="hidden md:table-cell">Descrição</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredEvents.map((occ) => (
                                        <TableRow key={occ.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold flex items-center gap-1">
                                                        <CalendarDays className="h-3 w-3" />
                                                        {format(new Date(occ.date), 'dd/MM/yy')}
                                                    </span>
                                                    <span className="text-muted-foreground ml-4">{format(new Date(occ.date), 'HH:mm')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm truncate max-w-[200px]">{occ.studentName}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{occ.studentClass} • RM: {occ.studentId}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider">{occ.type}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{occ.description}"</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getStatusColor(occ.status))}>
                                                    {occ.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingOccurrence(occ); setIsFormOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeletingOccurrence(occ)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                            <FileText className="mx-auto h-16 w-16 mb-4 opacity-10" />
                            <h3 className="text-lg font-semibold text-foreground/70">Nenhum registro encontrado</h3>
                            <p className="max-w-xs mx-auto text-sm">
                                {searchTerm ? "Não existem ocorrências que correspondam à sua pesquisa." : "O histórico está limpo. Comece a registrar os eventos para acompanhar os alunos."}
                            </p>
                            {searchTerm && (
                                <Button variant="link" onClick={() => setSearchTerm('')} className="mt-2">Limpar busca</Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {isFormOpen && (
                <OccurrenceFormDialog
                    isOpen={isFormOpen}
                    onClose={() => { setIsFormOpen(false); setEditingOccurrence(null); }}
                    onSave={handleSave}
                    occurrence={editingOccurrence}
                    students={allStudents}
                    isSaving={isSaving}
                />
            )}

            <AlertDialog open={!!deletingOccurrence} onOpenChange={() => setDeletingOccurrence(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Registro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deseja remover este evento específico do prontuário de <strong>{deletingOccurrence?.studentName}</strong>? Esta ação não apagará outras ocorrências do mesmo aluno, apenas esta selecionada.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Confirmar Exclusão</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

import { AlertCircle } from 'lucide-react';
