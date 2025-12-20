
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import ServidorTable from './servidor-table';
import type { SortConfig } from './servidor-table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import ServidorEditDialog from './servidor-edit-dialog';

export default function ServidorDataView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingServidor, setEditingServidor] = useState<any | null>(null);
  const [deletingServidor, setDeletingServidor] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'nomeCompleto', direction: 'ascending' });
  const debouncedSearch = useDebounce(searchTerm, 400);

  const [allServidores, setAllServidores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const servidoresQuery = query(collection(firestore, 'servidores'));
            const querySnapshot = await getDocs(servidoresQuery);
            const servidoresData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllServidores(servidoresData);
        } catch (error) {
            console.error("Error fetching servidores data:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Carregar Dados",
                description: "Não foi possível carregar os dados dos servidores.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [firestore, toast]);


  const filteredAndSortedServidores = useMemo(() => {
    if (!allServidores) return [];

    let processedServidores = [...allServidores];
    const searchLower = debouncedSearch.toLowerCase().trim();
    
    if (searchLower.length > 0) {
      processedServidores = processedServidores.filter(servidor => 
        (servidor.nomeCompleto?.toLowerCase().includes(searchLower) || servidor.cpf?.includes(searchLower))
      );
    }
    
    processedServidores.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });

    return processedServidores;
  }, [allServidores, debouncedSearch, sortConfig]);


  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };
  
  const handleEdit = (servidor: any) => {
    setEditingServidor(servidor);
  };

  const handleDeleteRequest = (servidor: any) => {
    setDeletingServidor(servidor);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingServidor) return;
    
    try {
        await deleteDoc(doc(firestore, 'servidores', deletingServidor.id));
        toast({
            title: "Servidor Removido",
            description: `O registo de ${deletingServidor.nomeCompleto} foi removido com sucesso.`
        });
        setAllServidores(prev => prev.filter(s => s.id !== deletingServidor.id));
    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Erro ao Remover',
            description: 'Não foi possível remover o registo. Tente novamente.'
        });
    } finally {
        setDeletingServidor(null);
    }
  }

  const handleSaveChanges = (updatedData: any) => {
    if (!firestore || !editingServidor?.id) return;

    const docRef = doc(firestore, 'servidores', editingServidor.id);
    const finalData = { ...updatedData, id: editingServidor.id };

    setDocumentNonBlocking(docRef, finalData, { merge: true });

    toast({
      title: "Servidor Atualizado",
      description: `O registo de ${updatedData.nomeCompleto} foi atualizado.`,
    });
    
    setAllServidores(prev => prev.map(s => s.id === editingServidor.id ? finalData : s));
    setEditingServidor(null);
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 flex gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <Button variant="ghost" size="icon" onClick={clearSearch}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>
      
      <div className="text-sm text-muted-foreground h-5">
         {!isLoading && filteredAndSortedServidores.length > 0 && `A exibir ${filteredAndSortedServidores.length} servidor(es).`}
      </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A carregar servidores...</p>
            </div>
        ) : (
            <ServidorTable 
                servidores={filteredAndSortedServidores}
                onEdit={handleEdit} 
                onDelete={handleDeleteRequest}
                onSort={handleSort}
                sortConfig={sortConfig}
            />
        )}

      {editingServidor && (
        <ServidorEditDialog
          isOpen={!!editingServidor}
          onClose={() => setEditingServidor(null)}
          servidor={editingServidor}
          onSave={handleSaveChanges}
        />
      )}

      {deletingServidor && (
        <AlertDialog open={!!deletingServidor} onOpenChange={() => setDeletingServidor(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isto irá apagar permanentemente o registo de
                        <strong className="text-foreground"> {deletingServidor.nomeCompleto}</strong>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Apagar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
