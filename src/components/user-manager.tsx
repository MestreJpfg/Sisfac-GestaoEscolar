"use client";

import { useState, useMemo, useCallback } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, limit, orderBy, startAfter, getDocs, Query } from 'firebase/firestore';
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

  const fetchUsers = useCallback(async ({ pageParam }: { pageParam: any }) => {
    if (!firestore) return { data: [], nextPage: undefined };

    let q: Query = query(
        collection(firestore, 'users'), 
        orderBy(sortConfig.key, sortConfig.direction),
        limit(USERS_PER_PAGE)
    );

    // Apply filters
    if (filters.profileId && filters.profileId !== 'all') {
        q = query(q, where('profileId', '==', filters.profileId));
    }
    
    // Client-side search will be applied after fetching
    if (pageParam) {
      q = query(q, startAfter(pageParam));
    }

    const snapshot = await getDocs(q);
    const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    
    return {
        data: usersData,
        nextPage: lastVisible
    };
  }, [firestore, filters.profileId, sortConfig]);

  const {
      data,
      fetchNextPage,
      hasNextPage,
      isLoading,
      isFetchingNextPage,
      error,
  } = useInfiniteQuery({
      queryKey: ['users', filters, sortConfig],
      queryFn: fetchUsers,
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const allUsers = useMemo(() => data?.pages.flatMap(page => page.data) ?? [], [data]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = allUsers;
    const searchLower = debouncedSearch.toLowerCase().trim();

    if (searchLower.length > 0) { // Allow search even with 1 or 2 characters now
      filtered = filtered.filter(user => 
        (user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower))
      );
    }
    
    // Sorting is now handled by the Firestore query `orderBy`, so no extra client-side sort is needed
    // unless the search filter is active, in which case we might re-sort the filtered subset if necessary,
    // but the initial order from Firestore is usually sufficient.

    return filtered;
  }, [allUsers, debouncedSearch]);


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
           {filteredAndSortedUsers.length > 0 && `A exibir ${filteredAndSortedUsers.length} utilizador(es).`}
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A carregar utilizadores...</p>
            </div>
        ) : filteredAndSortedUsers.length === 0 && (filters.search || filters.profileId) ? (
            <Card>
                <CardContent className="p-6 text-center h-64 flex flex-col items-center justify-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum Utilizador Encontrado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tente refinar os seus filtros de busca.
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
