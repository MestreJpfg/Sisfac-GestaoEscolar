
"use client";

import { useState, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, startAfter, getDocs, Query, DocumentData } from 'firebase/firestore';
import { useInfiniteQuery } from '@tanstack/react-query';
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

const USERS_PER_PAGE = 20;

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

  const fetchUsers = useCallback(async ({ pageParam = null }: { pageParam?: DocumentData | null }) => {
    if (!firestore) return { data: [], lastDoc: null };

    let q: Query<DocumentData, DocumentData>;
    const usersCollection = collection(firestore, 'users');
    
    let baseQuery = query(usersCollection);

    if (filters.profileId && filters.profileId !== 'all') {
      baseQuery = query(baseQuery, where('profileId', '==', filters.profileId));
    }
    
    // A ordenação é aplicada no cliente para evitar a necessidade de criar índices compostos complexos no Firestore
    // para cada combinação de filtro e ordenação.
    q = baseQuery;
    
    if (pageParam) {
      q = query(q, startAfter(pageParam));
    }
    
    q = query(q, limit(USERS_PER_PAGE));

    const snapshot = await getDocs(q);
    const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, uid: doc.id }));
    const lastDoc = snapshot.docs.length === USERS_PER_PAGE ? snapshot.docs[snapshot.docs.length - 1] : null;

    return { data: usersData, lastDoc };
  }, [firestore, filters.profileId]);


  const {
      data,
      fetchNextPage,
      hasNextPage,
      isLoading,
      isFetchingNextPage,
      refetch,
  } = useInfiniteQuery({
      queryKey: ['users', filters.profileId, sortConfig],
      queryFn: fetchUsers,
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.lastDoc,
  });

  const allUsers = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);

  const filteredAndSortedUsers = useMemo(() => {
    let processedUsers = [...allUsers];
    const searchLower = debouncedSearch.toLowerCase().trim();

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
  }, [allUsers, debouncedSearch, sortConfig]);


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
    
    refetch();

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
           {allUsers.length > 0 && `A exibir ${filteredAndSortedUsers.length} de ${allUsers.length} utilizador(es) carregados.`}
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A carregar utilizadores...</p>
            </div>
        ) : allUsers.length === 0 ? (
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
                profiles={allProfiles}
                onEdit={handleEditUser} 
                onSort={handleSort}
                sortConfig={sortConfig}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
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
