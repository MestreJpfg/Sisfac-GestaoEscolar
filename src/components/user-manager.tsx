'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft } from 'lucide-react';
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
    // Only query for users if the current user is a loaded admin
    if (!firestore || isProfileLoading || !currentUserProfile || currentUserProfile.profileId !== 'Administrador') return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore, currentUserProfile, isProfileLoading]);

  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  const isLoading = isUserLoading || isProfileLoading;
  const isAuthorized = currentUserProfile?.profileId === 'Administrador';

  useEffect(() => {
    // This effect runs once after the initial loading is complete.
    // If, after loading, the user is not an admin, redirect them.
    if (!isLoading && !isAuthorized) {
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description: 'Não tem permissão para aceder a esta página.',
      });
      router.push('/dashboard');
    }
  }, [isLoading, isAuthorized, router, toast]);


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
  
  // While initial auth/profile checks are running, show a full-page loader.
  // This prevents premature redirection or rendering of content.
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  // After loading, if the user is not authorized, the useEffect will have triggered a redirect.
  // Rendering null here prevents a flash of content before the redirect happens.
  if (!isAuthorized) {
    return null;
  }

  return (
    <>
       <div className="flex min-h-screen flex-col">
         <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                      <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Utilizadores</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-1">
                        <ThemeToggle />
                        <UserNav />
                    </nav>
                </div>
            </div>
        </header>

        <main className="flex-1 py-8">
          <div className="container">
            {isUsersLoading ? (
               <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
               </div>
            ) : (
                <UserTable 
                  users={users || []} 
                  onEdit={handleEditUser} 
                  isAdmin={currentUserProfile.profileId === 'Administrador'}
                />
            )}
          </div>
        </main>
        <AppFooter />
      </div>

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
