
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Loader2, Calendar, User, Trash2, Edit, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

    // Buscar ocorrências em tempo real
    const occurrencesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'ocorrencias'), orderBy('date', 'desc'));
    }, [firestore]);

    const { data: occurrences, isLoading: isLoadingOccurrences } = useCollection(occurrencesQuery);

    // Buscar alunos para o autocomplete do formulário
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

    const filteredOccurrences = useMemo(() => {
        if (!occurrences) return [];
        const lowerSearch = searchTerm.toLowerCase();
        return occurrences.filter(occ => 
            occ.studentName?.toLowerCase().includes(lowerSearch) ||
            occ.type?.toLowerCase().includes(lowerSearch) ||
            occ.description?.toLowerCase().includes(lowerSearch)
        );
    }, [occurrences, searchTerm]);

    const handleSave = async (data: any) => {
        if (!firestore) return;

        setIsSaving(true);
        try {
            const id = data.id || doc(collection(firestore, 'ocorrencias')).id;
            const docRef = doc(firestore, 'ocorrencias', id);
            
            const finalData = {
                ...data,
                id,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Utilizando o padrão await setDoc (bloqueante com tratamento de erro local)
            await setDoc(docRef, finalData, { merge: true });

            toast({
                title: data.id ? "Ocorrência Atualizada" : "Ocorrência Registrada",
                description: `A ocorrência de ${data.studentName} foi salva com sucesso.`,
            });

            setIsFormOpen(false);
            setEditingOccurrence(null);
        } catch (error: any) {
            console.error("Erro ao salvar ocorrência:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível gravar a ocorrência. Verifique as suas permissões.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!firestore || !deletingOccurrence) return;
        try {
            await deleteDoc(doc(firestore, 'ocorrencias', deletingOccurrence.id));
            toast({ title: "Ocorrência Eliminada" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao eliminar" });
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
                        placeholder="Pesquisar por aluno, tipo ou descrição..." 
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={() => { setEditingOccurrence(null); setIsFormOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Registrar Ocorrência
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Ocorrências</CardTitle>
                    <CardDescription>Lista completa de eventos disciplinares e administrativos registrados.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingOccurrences ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredOccurrences.length > 0 ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Aluno</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="hidden md:table-cell">Relatado por</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOccurrences.map((occ) => (
                                        <TableRow key={occ.id}>
                                            <TableCell className="whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{format(new Date(occ.date), 'dd/MM/yyyy')}</span>
                                                    <span className="text-xs text-muted-foreground">{format(new Date(occ.date), 'HH:mm')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{occ.studentName}</span>
                                                    <span className="text-xs text-muted-foreground">{occ.studentClass}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{occ.type}</Badge>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm">
                                                {occ.reportedBy || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(occ.status)}>
                                                    {occ.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => { setEditingOccurrence(occ); setIsFormOpen(true); }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingOccurrence(occ)}>
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
                        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
                            <FileText className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>Nenhuma ocorrência encontrada para a busca atual.</p>
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
                            Tem certeza que deseja apagar esta ocorrência? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
