
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft, Plus } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import ProfileTable from './profile-table';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import ProfileEditDialog from './profile-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';


export default function ProfileManager() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<any | null>(null);

  const profilesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'profiles'), orderBy('name'));
  }, [firestore]);

  const { data: profiles, isLoading: isProfilesLoading } = useCollection(profilesQuery);

  const handleEditProfile = (profile: any) => {
    setEditingProfile(profile);
    setIsNew(false);
  };

  const handleNewProfile = () => {
    setEditingProfile({});
    setIsNew(true);
  };

  const handleDeleteRequest = (profile: any) => {
    setDeletingProfile(profile);
  };

  const confirmDelete = async () => {
    if (!firestore || !deletingProfile) return;
    try {
        await deleteDoc(doc(firestore, 'profiles', deletingProfile.id));
        toast({
            title: "Perfil Eliminado",
            description: `O perfil "${deletingProfile.name}" foi eliminado com sucesso.`
        });
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Erro ao Eliminar',
            description: 'Não foi possível eliminar o perfil. Tente novamente.'
        });
    } finally {
        setDeletingProfile(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingProfile(null);
    setIsNew(false);
  };

  const handleSaveChanges = (updatedData: any, profileId?: string) => {
    if (!firestore) return;

    const id = profileId || doc(collection(firestore, 'profiles')).id;
    const docRef = doc(firestore, 'profiles', id);
    
    setDocumentNonBlocking(docRef, { id, ...updatedData }, { merge: true });

    toast({
      title: isNew ? "Perfil Criado" : "Perfil Atualizado",
      description: `O perfil "${updatedData.name}" foi salvo com sucesso.`,
    });
    
    handleCloseDialog();
  };
  
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
                      <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Perfis</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <Button onClick={handleNewProfile}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Perfil
                    </Button>
                    <nav className="flex items-center space-x-1">
                        <ThemeToggle />
                        <UserNav />
                    </nav>
                </div>
            </div>
        </header>

        <main className="flex-1 py-8">
          <div className="container">
            {isProfilesLoading ? (
                 <div className="flex h-64 w-full items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 </div>
            ): (
                <ProfileTable 
                  profiles={profiles || []} 
                  onEdit={handleEditProfile} 
                  onDelete={handleDeleteRequest}
                />
            )}
          </div>
        </main>
        <AppFooter />
      </div>

      {editingProfile && (
        <ProfileEditDialog
          isOpen={!!editingProfile}
          onClose={handleCloseDialog}
          profile={isNew ? null : editingProfile}
          onSave={handleSaveChanges}
        />
      )}

      {deletingProfile && (
        <AlertDialog open={!!deletingProfile} onOpenChange={() => setDeletingProfile(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o perfil
                        <strong className="text-foreground"> {deletingProfile.name}</strong>. Os utilizadores com este perfil podem perder o acesso a certas funcionalidades.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
