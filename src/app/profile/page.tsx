
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useUser, useAuth, useFirestore, useStorage, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc } from 'firebase/firestore';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function ProfilePage() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Memoize the doc ref to prevent re-renders in useDoc
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile } = useDoc(userDocRef);

    const [displayName, setDisplayName] = useState('');
    const [cargo, setCargo] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
        }
        if (userProfile) {
            setCargo(userProfile.cargo || '');
        }
    }, [user, userProfile]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar à base de dados.',
            });
            return;
        }

        setIsSaving(true);
        try {
            let newPhotoURL = user.photoURL;

            // 1. Upload new photo if one was selected
            if (photo) {
                const storageRef = ref(storage, `profile-pictures/${user.uid}`);
                const snapshot = await uploadBytes(storageRef, photo);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // 2. Update user profile in Firebase Auth
            await updateProfile(user, { 
                displayName,
                photoURL: newPhotoURL 
            });

            // 3. Update user document in Firestore
            const userDocToUpdate = doc(firestore, 'users', user.uid);
            const userData: { name: string; cargo: string; photoURL?: string } = {
                name: displayName,
                cargo: cargo,
            };
            if (newPhotoURL) {
                 userData.photoURL = newPhotoURL;
            }
            setDocumentNonBlocking(userDocToUpdate, userData, { merge: true });

            toast({
                title: 'Perfil Atualizado',
                description: 'As suas informações foram atualizadas com sucesso.',
            });
            
            // Clean up
            setPhoto(null);
            setPhotoPreview(null);
            router.refresh();

        } catch (error: any) {
            console.error("Erro ao atualizar perfil:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Atualizar',
                description: 'Não foi possível atualizar o seu perfil. Tente novamente.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    const currentAvatarSrc = photoPreview || user.photoURL;

    return (
        <AuthGuard>
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <div className="flex items-center space-x-6">
                            <div className="relative">
                                <Avatar className="h-24 w-24">
                                    <AvatarImage src={currentAvatarSrc || undefined} />
                                    <AvatarFallback className="text-3xl">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Camera className="h-4 w-4" />
                                </Button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handlePhotoChange}
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                />
                            </div>
                            <div>
                                <CardTitle className="text-2xl">{displayName || 'Utilizador sem nome'}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                                <CardDescription className="font-semibold">{cargo || 'Cargo não definido'}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome</Label>
                                    <Input 
                                        id="name" 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cargo">Cargo</Label>
                                    <Input 
                                        id="cargo" 
                                        value={cargo} 
                                        onChange={(e) => setCargo(e.target.value)}
                                    />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={user.email || ''} disabled />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" type="button" onClick={() => router.push('/dashboard')}>
                                    Voltar
                                </Button>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </main>
        </AuthGuard>
    );
}
