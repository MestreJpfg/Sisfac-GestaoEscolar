
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const messagesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'mural'), orderBy('createdAt', 'asc'));
    }, [firestore]);

    const { data: messages, isLoading: isLoadingMessages, error } = useCollection(messagesQuery);

    // Efeito para lidar com erros da coleção
    useEffect(() => {
        if (error) {
            console.error("Error fetching messages: ", error);
            toast({
                variant: 'destructive',
                title: "Erro ao Carregar Mural",
                description: "Não foi possível carregar as mensagens. Verifique as suas permissões e tente novamente.",
            });
        }
    }, [error, toast]);


    const handleSubmitMessage = async () => {
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
        
        try {
            // Usamos setDoc em vez de setDocumentNonBlocking para garantir que a mensagem foi enviada
            await setDoc(messageRef, messageData);
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message: ", error);
            toast({
                variant: 'destructive',
                title: "Erro ao Enviar",
                description: "Não foi possível enviar a sua mensagem. Tente novamente.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Auto-scroll to the bottom when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    return (
        <AuthGuard>
            <div className="flex h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-6 w-6 text-primary"/>
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

                <main className="flex-1 overflow-hidden">
                    <div className="container h-full flex flex-col pt-6 pb-2">
                        <div className="flex-1 overflow-y-auto pr-4 -mr-4 mb-4" ref={scrollAreaRef}>
                            {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : messages && messages.length > 0 ? (
                                <div className="space-y-6">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className="flex gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={msg.authorPhotoURL} alt={msg.authorName} />
                                                <AvatarFallback>{getInitials(msg.authorName)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="flex items-baseline gap-2">
                                                    <p className="font-semibold text-primary">{msg.authorName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                                                    </p>
                                                </div>
                                                <div className="mt-1 text-sm text-foreground bg-secondary/30 rounded-lg p-3 whitespace-pre-wrap">
                                                    {msg.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <MessageSquare size={48} className="mb-4" />
                                    <p className="font-semibold">Ainda não há mensagens no mural.</p>
                                    <p className="text-sm">Seja o primeiro a publicar!</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-auto pt-4 border-t">
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmitMessage(); }} className="relative">
                                <Textarea
                                    placeholder="Escreva a sua mensagem aqui..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    rows={3}
                                    className="pr-24"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmitMessage();
                                        }
                                    }}
                                />
                                <Button 
                                    type="submit" 
                                    size="icon" 
                                    className="absolute bottom-2 right-2 rounded-full" 
                                    disabled={isSubmitting || !newMessage.trim()}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                    <span className="sr-only">Enviar Mensagem</span>
                                </Button>
                            </form>
                        </div>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
