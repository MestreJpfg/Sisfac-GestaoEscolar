
'use client';

import { useState } from 'react';
import { useUser, useAuth } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
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
    const { toast } = useToast();
    const router = useRouter();
    
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSaving(true);
        try {
            await updateProfile(user, { displayName });
            toast({
                title: 'Perfil Atualizado',
                description: 'O seu nome foi atualizado com sucesso.',
            });
            // Force a reload of the user object by re-rendering or using a dedicated state management
             router.refresh();
        } catch (error: any) {
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

    return (
        <AuthGuard>
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <div className="flex items-center space-x-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl">{displayName || 'Utilizador sem nome'}</CardTitle>
                                <CardDescription>{user.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={user.email || ''} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input 
                                    id="name" 
                                    value={displayName} 
                                    onChange={(e) => setDisplayName(e.target.value)}
                                />
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
