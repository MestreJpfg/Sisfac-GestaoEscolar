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

  const isAuthorized = currentUserProfile?.profileId === 'Administrador';

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthorized) return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore, isAuthorized]);

  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  useEffect(() => {
    const doneLoading = !isUserLoading && !isProfileLoading;
    if (doneLoading && !isAuthorized) {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Não tem permissão para aceder a esta página.',
        });
        router.replace('/dashboard');
    }
  }, [isAuthorized, isUserLoading, isProfileLoading, router, toast]);

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

  const isLoading = isUserLoading || isProfileLoading || (isAuthorized && isUsersLoading);

  if (isLoading || !isAuthorized) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <>
      <UserTable 
        users={users || []} 
        onEdit={handleEditUser} 
      />

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
