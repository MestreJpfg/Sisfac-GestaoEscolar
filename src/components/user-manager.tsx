'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy, getDoc } from 'firebase/firestore';
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
  
  const profileDocRef = useMemoFirebase(() => {
    if (!currentUserProfile?.profileId || !firestore) return null;
    return doc(firestore, 'profiles', currentUserProfile.profileId);
  }, [currentUserProfile, firestore]);

  const { data: profileDetails, isLoading: isProfileDetailsLoading } = useDoc(profileDocRef);
  
  const isAuthorized = useMemo(() => {
    if (isProfileLoading || isProfileDetailsLoading) return undefined;
    if (currentUserProfile?.profileId === 'Administrador') return true;
    const hasPermission = profileDetails?.permissions?.includes('manage:users') || currentUserProfile?.customPermissions?.includes('manage:users');
    return hasPermission;
  }, [isProfileLoading, isProfileDetailsLoading, currentUserProfile, profileDetails]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || isAuthorized !== true) return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore, isAuthorized]);

  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  useEffect(() => {
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

  const isLoading = isUserLoading || isProfileLoading || isProfileDetailsLoading || isAuthorized === undefined || (isAuthorized && isUsersLoading);

  if (isLoading) {
    return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

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
