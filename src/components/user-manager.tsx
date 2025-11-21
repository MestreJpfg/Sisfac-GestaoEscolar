'use client';

import { useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import UserTable from './user-table';
import UserEditDialog from './user-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import type { SortConfig } from './user-table';

interface UserManagerProps {
  initialUsers: any[];
  allProfiles: any[];
}

export default function UserManager({ initialUsers, allProfiles }: UserManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    profileId: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });
  const debouncedSearch = useDebounce(filters.search, 300);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value === 'all' ? '' : value }));
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
  
  const filteredAndSortedUsers = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    
    let filtered = initialUsers;

    // Apply profile filter first if it exists
    if (filters.profileId) {
      filtered = filtered.filter(user => user.profileId === filters.profileId);
    }
    
    // Then apply search filter if it exists
    if (searchLower) {
      filtered = filtered.filter(user => 
        (user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower))
      );
    }

    if (sortConfig.key !== null) {
      const profileNameMap = new Map(allProfiles.map(p => [p.id, p.name]));

      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'profileId') {
            aValue = profileNameMap.get(a.profileId) || a.profileId;
            bValue = profileNameMap.get(b.profileId) || b.profileId;
        } else {
            aValue = a[sortConfig.key] || '';
            bValue = b[sortConfig.key] || '';
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [initialUsers, debouncedSearch, filters.profileId, sortConfig, allProfiles]);

  const hasActiveFilters = filters.search || filters.profileId;

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
            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <UserTable 
        users={filteredAndSortedUsers}
        profiles={allProfiles}
        onEdit={handleEditUser} 
        onSort={handleSort}
        sortConfig={sortConfig}
      />

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
