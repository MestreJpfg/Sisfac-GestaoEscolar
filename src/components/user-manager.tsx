
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, doc, getDocs } from 'firebase/firestore';
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

export default function UserManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    profileId: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const debouncedSearch = useDebounce(filters.search, 400);

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!firestore) return;
        setIsLoading(true);
        try {
            const usersQuery = query(collection(firestore, 'users'));
            const profilesQuery = query(collection(firestore, 'profiles'));

            const [usersSnapshot, profilesSnapshot] = await Promise.all([
                getDocs(usersQuery),
                getDocs(profilesQuery)
            ]);

            setAllUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setAllProfiles(profilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) {
            console.error("Error fetching user/profile data:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Carregar Dados",
                description: "Não foi possível carregar os dados dos utilizadores e perfis.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchData();
  }, [firestore, toast]);


  const filteredAndSortedUsers = useMemo(() => {
    if (!allUsers) return [];

    let processedUsers = [...allUsers];
    const searchLower = debouncedSearch.toLowerCase().trim();

    if (filters.profileId && filters.profileId !== 'all') {
      processedUsers = processedUsers.filter(user => user.profileId === filters.profileId);
    }
    
    if (searchLower.length > 0) {
      processedUsers = processedUsers.filter(user => 
        (user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower))
      );
    }
    
    processedUsers.sort((a, b) => {
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

    return processedUsers;
  }, [allUsers, debouncedSearch, filters.profileId, sortConfig]);


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
    
    // Optimistic update on the client
    setAllUsers(prevUsers => prevUsers.map(u => u.uid === editingUser.uid ? { ...u, ...updatedData } : u));

    handleCloseDialog();
  };

  return (
    <div className="space-y-6">
       <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Buscar por nome ou email..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select value={filters.profileId} onValueChange={(value) => handleFilterChange('profileId', value)} disabled={isLoading}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder={isLoading ? "A carregar perfis..." : "Filtrar por perfil..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                {allProfiles?.map(profile => (
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
           {!isLoading && filteredAndSortedUsers.length > 0 && `A exibir ${filteredAndSortedUsers.length} utilizador(es).`}
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A carregar utilizadores...</p>
            </div>
        ) : filteredAndSortedUsers.length === 0 ? (
             <Card>
                <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum Utilizador Encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Não existem utilizadores para o filtro selecionado.
                    </p>
                </CardContent>
            </Card>
        ) : (
             <UserTable 
                users={filteredAndSortedUsers}
                profiles={allProfiles || []}
                onEdit={handleEditUser} 
                onSort={handleSort}
                sortConfig={sortConfig}
            />
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
