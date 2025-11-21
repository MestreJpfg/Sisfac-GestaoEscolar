'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import UserTable from './user-table';
import { useRouter } from 'next/navigation';
import UserEditDialog from './user-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function UserManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const currentUserDocRef = useMemoFirebase(() => {
    if (!currentUser || !firestore) return null;
    return doc(firestore, 'users', currentUser.uid);
  }, [currentUser, firestore]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserDocRef);

  const isAuthorized = useMemo(() => {
    if (isProfileLoading) return undefined; // Return undefined while loading
    return currentUserProfile?.profileId === 'Administrador';
  }, [isProfileLoading, currentUserProfile]);

  const usersQuery = useMemoFirebase(() => {
    // Only fetch users if authorized. Don't query while authorization status is unknown.
    if (!firestore || isAuthorized !== true) return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore, isAuthorized]);

  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  useEffect(() => {
    // Wait until authorization status is determined (not undefined)
    if (isAuthorized === false) {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Não tem permissão para aceder a esta página.',
        });
        router.replace('/dashboard');
    }
  }, [isAuthorized, router, toast]);

  const handleEditUser = (user: any) => {
    setEditingUser(user);
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
  };

  const handleSaveChanges = (updatedData: any) => {
    if (!firestore || !editingUser?.uid) return;

    const docRef = doc(firestore, 'users', editingUser.uid);
    setDocumentNonBlocking(docRef, updatedData, { merge: true });

    toast({
      title: "Utilizador Atualizado",
      description: `O perfil de ${updatedData.name || editingUser.name} foi atualizado com sucesso.`,
    });
    
    handleCloseDialog();
  };

  // Show loader while user/profile is loading or authorization is not yet determined
  const isLoading = isUserLoading || isProfileLoading || isAuthorized === undefined || (isAuthorized && isUsersLoading);

  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // If authorized, render the table. If not authorized, this component will be unmounted by redirect,
  // or will show nothing until the redirect happens.
  return (
    <>
      {isAuthorized && users && (
        <UserTable 
          users={users} 
          onEdit={handleEditUser} 
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
    </>
  );
}
