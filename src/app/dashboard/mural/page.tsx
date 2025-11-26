
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

export default function MuralPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [newMessage, setNewMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'mural'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: messages, isLoading: isLoadingMessages } = useCollection(messagesQuery);

    const handleSubmitMessage = () => {
        if (!firestore || !user || !newMessage.trim()) return;

        setIsSubmitting(true);

        const messageId = doc(collection(firestore, 'mural')).id;
        const messageRef = doc(firestore, 'mural', messageId);

        const messageData = {
            id: messageId,
            message: newMessage.trim(),
            authorId: user.uid,
            authorName: user.displayName || 'Utilizador Anónimo',
            authorPhotoURL: user.photoURL || null,
            createdAt: new Date().toISOString(),
        };

        setDocumentNonBlocking(messageRef, messageData);
        
        toast({
            title: "Mensagem Enviada!",
            description: "A sua mensagem foi publicada no mural.",
        });

        setNewMessage('');
        setIsSubmitting(false);
    };

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
                                <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Mural de Mensagens</h1>
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
                    <div className="container max-w-4xl">
                        <Card>
                            <CardHeader>
                                <CardTitle>Publicar Nova Mensagem</CardTitle>
                                <CardDescription>Escreva uma mensagem que ficará visível para todos os utilizadores.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid w-full gap-2">
                                    <Textarea
                                        placeholder="Escreva a sua mensagem aqui..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        rows={4}
                                    />
                                    <Button onClick={handleSubmitMessage} disabled={isSubmitting || !newMessage.trim()}>
                                        {isSubmitting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="mr-2 h-4 w-4" />
                                        )}
                                        Publicar Mensagem
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Mensagens Recentes</h2>
                             {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : messages && messages.length > 0 ? (
                                <ScrollArea className="h-[500px] pr-4">
                                    <div className="space-y-6">
                                        {messages.map((msg) => (
                                            <Card key={msg.id} className="w-full">
                                                <CardContent className="p-4 flex gap-4">
                                                    <Avatar>
                                                        <AvatarImage src={msg.authorPhotoURL} />
                                                        <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-semibold text-primary">{msg.authorName}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {format(new Date(msg.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                            </p>
                                                        </div>
                                                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{msg.message}</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <p className="text-center text-muted-foreground py-10">Ainda não há mensagens no mural. Seja o primeiro a publicar!</p>
                            )}
                        </div>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
