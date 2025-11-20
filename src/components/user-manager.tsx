'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import UserTable from './user-table';
import { useRouter } from 'next/navigation';
import UserEditDialog from './user-edit-dialog';
import { useToast } from '@/hooks/use-toast';

interface UserManagerProps {
    users: any[];
}

export default function UserManager({ users }: UserManagerProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);

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

  return (
    <>
      <UserTable 
        users={users} 
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
