'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import UserTable from './user-table';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import UserEditDialog from './user-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDoc } from '@/firebase/firestore/use-doc';


export default function UserManager() {
  const firestore = useFirestore();
  const router = useRouter();
  const { user: currentUser, isUserLoading } = useUser();
  const { toast } = useToast();
  
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const currentUserDocRef = useMemo(() => {
    if (!currentUser || !firestore) return null;
    return doc(firestore, 'users', currentUser.uid);
  }, [currentUser, firestore]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc(currentUserDocRef);
  
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore]);

  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  const isLoading = isUserLoading || isProfileLoading || isUsersLoading;

  useEffect(() => {
    // Apenas toma uma ação quando o carregamento do perfil terminar
    if (!isProfileLoading && currentUserProfile) {
      if (currentUserProfile.profileId !== 'Administrador') {
        toast({
            variant: 'destructive',
            title: 'Acesso Negado',
            description: 'Não tem permissão para aceder a esta página.'
        });
        router.push('/dashboard');
      }
    }
  }, [currentUserProfile, isProfileLoading, router, toast]);

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
      description: `O perfil de ${updatedData.name} foi atualizado com sucesso.`,
    });
    
    handleCloseDialog();
  };
  
  // Mostra o ecrã de carregamento enquanto as permissões estão a ser verificadas
  if (isLoading || !currentUserProfile) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // Se, após o carregamento, não for administrador, não renderiza nada (o useEffect irá redirecionar)
  if (currentUserProfile.profileId !== 'Administrador') {
    return null;
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-7xl mx-auto flex-1">
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="w-full flex items-start justify-between">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Voltar ao Painel
                </Button>
              <div className="flex flex-col items-center text-center">
                <Image src="/logoyuri.png" alt="Logo" width={100} height={100} className="rounded-md" priority />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserNav />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary [text-shadow:0_2px_10px_hsl(var(--primary)/0.4)] font-headline mt-6">
              Gestão de Utilizadores
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              Visualize e gira os utilizadores registados na plataforma.
            </p>
          </header>

          <div className="w-full">
            <UserTable 
              users={users || []} 
              onEdit={handleEditUser} 
              isAdmin={currentUserProfile.profileId === 'Administrador'}
            />
          </div>
        </div>
        <AppFooter />
      </main>

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
