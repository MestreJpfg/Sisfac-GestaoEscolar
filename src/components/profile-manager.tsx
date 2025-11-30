
'use client';

import { useState, useMemo } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import ProfileTable from './profile-table';
import { Button } from './ui/button';
import ProfileEditDialog from './profile-edit-dialog';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export default function ProfileManager() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [editingProfile, setEditingProfile] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState<any | null>(null);

  const profilesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'profiles'));
  }, [firestore]);

  const { data: initialProfiles, isLoading } = useCollection(profilesQuery);

  const profiles = useMemo(() => {
    if (!initialProfiles) return [];
    return [...initialProfiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [initialProfiles]);


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
      <div className="flex justify-end mb-4">
        <Button onClick={handleNewProfile}>
            <Plus className="mr-2 h-4 w-4" /> Novo Perfil
        </Button>
      </div>
      {isLoading ? (
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
