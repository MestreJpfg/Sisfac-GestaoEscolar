
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, Megaphone, Trash2, Edit, Search } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import AnnouncementEditDialog from '@/components/announcement-edit-dialog';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { deleteDoc } from 'firebase/firestore';


export default function AnnouncementsPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
    const [deletingAnnouncement, setDeletingAnnouncement] = useState<any | null>(null);
    const [isNew, setIsNew] = useState(false);

    const announcementsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: announcements, isLoading: isLoadingAnnouncements } = useCollection(announcementsQuery);
    
    const profilesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'profiles'), orderBy('name'));
    }, [firestore]);
    const { data: profiles } = useCollection(profilesQuery);
    const profileMap = useMemo(() => new Map(profiles?.map(p => [p.id, p.name])), [profiles]);


    const handleNewAnnouncement = () => {
        setEditingAnnouncement({});
        setIsNew(true);
    };

    const handleEditAnnouncement = (announcement: any) => {
        setEditingAnnouncement(announcement);
        setIsNew(false);
    };

    const handleDeleteRequest = (announcement: any) => {
        setDeletingAnnouncement(announcement);
    };

    const handleCloseDialog = () => {
        setEditingAnnouncement(null);
        setIsNew(false);
    };

    const handleSaveAnnouncement = (data: any, announcementId?: string) => {
        if (!firestore || !user) return;

        const id = announcementId || doc(collection(firestore, 'announcements')).id;
        const docRef = doc(firestore, 'announcements', id);
        
        const announcementData = {
            ...data,
            id: id,
            authorId: user.uid,
            authorName: user.displayName,
            createdAt: announcementId ? editingAnnouncement.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setDocumentNonBlocking(docRef, announcementData, { merge: true });

        toast({
            title: isNew ? "Comunicado Criado" : "Comunicado Atualizado",
            description: `O comunicado "${data.title}" foi salvo com sucesso.`,
        });
        
        handleCloseDialog();
    };

    const confirmDelete = async () => {
        if (!firestore || !deletingAnnouncement) return;
        try {
            await deleteDoc(doc(firestore, 'announcements', deletingAnnouncement.id));
            toast({
                title: "Comunicado Eliminado",
                description: `O comunicado foi eliminado com sucesso.`
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao Eliminar',
                description: 'Não foi possível eliminar o comunicado. Tente novamente.'
            });
        } finally {
            setDeletingAnnouncement(null);
        }
    };
    
    const getAudienceLabels = (targetAudience: string[]) => {
        if (!targetAudience) return [];
        if (targetAudience.includes('all')) return ['Todos os Utilizadores'];

        return targetAudience.map(id => profileMap.get(id) || id);
    };

    const formatAnnouncementDate = (dateString: string | undefined) => {
        if (!dateString) return 'Data desconhecida';
        try {
            return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
        } catch {
            return 'Data inválida';
        }
    }

    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Comunicados</h1>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end space-x-2">
                            <Button onClick={handleNewAnnouncement}>
                                <Plus className="mr-2 h-4 w-4" /> Novo Comunicado
                            </Button>
                            <nav className="flex items-center space-x-1">
                                <ThemeToggle />
                                <UserNav />
                            </nav>
                        </div>
                    </div>
                </header>

                <main className="flex-1 py-8">
                    <div className="container max-w-5xl">
                        {isLoadingAnnouncements ? (
                            <p>A carregar comunicados...</p>
                        ) : announcements && announcements.length > 0 ? (
                           <div className="space-y-6">
                             {announcements.map((ann) => (
                                <Card key={ann.id}>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle>{ann.title}</CardTitle>
                                                <CardDescription className="text-xs mt-1">
                                                    Publicado por {ann.authorName || 'Autor desconhecido'} em {formatAnnouncementDate(ann.createdAt)}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditAnnouncement(ann)}>
                                                    <Edit className="h-4 w-4"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteRequest(ann)}>
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="whitespace-pre-wrap">{ann.content}</p>
                                        <div className="mt-4 flex flex-wrap gap-2 items-center">
                                            <span className="text-xs font-semibold">Para:</span>
                                            {getAudienceLabels(ann.targetAudience).map(label => (
                                                <Badge key={label} variant="secondary">{label}</Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                           </div>
                        ) : (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-4 text-lg font-medium">Nenhum Comunicado Encontrado</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Crie o primeiro comunicado para partilhar informações.</p>
                                <Button className="mt-6" onClick={handleNewAnnouncement}>
                                    <Plus className="mr-2 h-4 w-4" /> Criar Comunicado
                                </Button>
                            </div>
                        )}
                    </div>
                </main>
                <AppFooter />
            </div>

            {editingAnnouncement && (
                <AnnouncementEditDialog
                    isOpen={!!editingAnnouncement}
                    onClose={handleCloseDialog}
                    announcement={isNew ? null : editingAnnouncement}
                    onSave={handleSaveAnnouncement}
                />
            )}

            {deletingAnnouncement && (
                <AlertDialog open={!!deletingAnnouncement} onOpenChange={() => setDeletingAnnouncement(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isto irá eliminar permanentemente o comunicado titled
                                <strong className="text-foreground"> {deletingAnnouncement.title}</strong>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </AuthGuard>
    );
}
