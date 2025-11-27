"use client";

import { useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, limit } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import UserTable from './user-table';
import UserEditDialog from './user-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { X, Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { SortConfig } from './user-table';

interface UserManagerProps {
  allProfiles: any[];
}

export default function UserManager({ allProfiles }: UserManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    profileId: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const debouncedSearch = useDebounce(filters.search, 400);

  const hasActiveFilters = useMemo(() => {
    // A busca é considerada ativa se houver texto de busca OU um perfil específico for selecionado
    return debouncedSearch.trim().length > 0 || (filters.profileId && filters.profileId !== 'all');
  }, [debouncedSearch, filters.profileId]);

  const usersQuery = useMemo(() => {
    if (!firestore || !hasActiveFilters) {
      return null; // Não faz a consulta se não houver filtros ativos
    }

    let q = query(collection(firestore, 'users'));

    // Filtra por perfil APENAS se um perfil específico (diferente de 'all') for selecionado
    if (filters.profileId && filters.profileId !== 'all') {
        q = query(q, where('profileId', '==', filters.profileId));
    }
    
    const searchLower = debouncedSearch.toLowerCase().trim();
    if (searchLower.length >= 3) {
      // Infelizmente, o Firestore não suporta consultas 'OR' complexas (nome OU email)
      // nem busca de 'contains' não sensível a maiúsculas/minúsculas de forma nativa e eficiente.
      // A busca por nome/email será feita no cliente após o fetch.
    }
    
    return q;
  }, [firestore, hasActiveFilters, filters.profileId, debouncedSearch]);

  const { data: fetchedUsers, isLoading: isLoadingUsers } = useCollection(usersQuery);

  const filteredAndSortedUsers = useMemo(() => {
    if (!fetchedUsers) return [];

    let filtered = fetchedUsers;
    const searchLower = debouncedSearch.toLowerCase().trim();

    // Filtro por nome/email no cliente, pois é mais flexível
    if (searchLower.length > 0) {
      filtered = filtered.filter(user => 
        (user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower))
      );
    }
    
    // Ordenação
    if (sortConfig.key) {
      const profileNameMap = new Map(allProfiles.map(p => [p.id, p.name]));
      filtered.sort((a, b) => {
        let aValue: any = sortConfig.key === 'profileId' ? (profileNameMap.get(a.profileId) || a.profileId) : a[sortConfig.key] || '';
        let bValue: any = sortConfig.key === 'profileId' ? (profileNameMap.get(b.profileId) || b.profileId) : b[sortConfig.key] || '';

        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [fetchedUsers, debouncedSearch, sortConfig, allProfiles]);


  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', profileId: '' });
  };

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
        key,
        direction: prevConfig.key === key && prevConfig.direction === 'ascending' ? 'descending' : 'ascending'
    }));
  };
  
  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
  };

  const handleSaveChanges = async (updatedData: any) => {
    if (!firestore || !editingUser?.uid) return;

    const docRef = doc(firestore, 'users', editingUser.uid);
    setDocumentNonBlocking(docRef, updatedData, { merge: true });

    toast({
      title: "Utilizador Atualizado",
      description: `O perfil de ${updatedData.name || editingUser.name} foi atualizado com sucesso.`,
    });
    
    handleCloseDialog();
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar por nome ou email (mín. 3 letras)..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select value={filters.profileId} onValueChange={(value) => handleFilterChange('profileId', value)}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Filtrar por perfil..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                {allProfiles.map(profile => (
                  <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filters.profileId || filters.search) && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
        <div className="text-sm text-muted-foreground h-5">
            {hasActiveFilters && !isLoadingUsers && (
              <p>
                {filteredAndSortedUsers.length > 0
                  ? `${filteredAndSortedUsers.length} utilizador(es) encontrado(s).`
                  : 'Nenhum utilizador encontrado com os critérios fornecidos.'
                }
              </p>
            )}
        </div>

        {isLoadingUsers ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A buscar utilizadores...</p>
            </div>
        ) : hasActiveFilters ? (
            <UserTable 
                users={filteredAndSortedUsers}
                profiles={allProfiles}
                onEdit={handleEditUser} 
                onSort={handleSort}
                sortConfig={sortConfig}
            />
        ) : (
             <Card>
                <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Inicie uma Busca</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Utilize os filtros acima para pesquisar os utilizadores.
                    </p>
                </CardContent>
            </Card>
        )}

      {editingUser && (
        <UserEditDialog
          isOpen={!!editingUser}
          onClose={handleCloseDialog}
          user={editingUser}
          onSave={handleSaveChanges}
        />
      )}
    </div>
  );
}
