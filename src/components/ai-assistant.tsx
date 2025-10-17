"use client";

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { knowledgeAssistant } from '@/ai/flows/knowledgeAssistant';
import { cn } from '@/lib/utils';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

export default function AiAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: query };
        setMessages((prev) => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const aiResponse = await knowledgeAssistant({
              query
            });
            
            const aiMessage: Message = { sender: 'ai', text: aiResponse };
            setMessages((prev) => [...prev, aiMessage]);

        } catch (error) {
            const errorMessage: Message = { sender: 'ai', text: 'Desculpe, ocorreu um erro ao processar sua solicitação.' };
            setMessages((prev) => [...prev, errorMessage]);
            console.error('AI Assistant Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="rounded-full w-14 h-14 shadow-lg">
                    {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
                </Button>
            </div>

            {isOpen && (
                <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm">
                    <Card className="flex flex-col h-[60vh] shadow-2xl">
                        <CardHeader className="flex-shrink-0">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <Bot className="h-6 w-6" />
                                Assistente IA
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col p-0">
                            <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "flex items-start gap-3",
                                                message.sender === 'user' ? 'justify-end' : 'justify-start'
                                            )}
                                        >
                                            {message.sender === 'ai' && (
                                                <Avatar className="w-8 h-8">
                                                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div
                                                className={cn(
                                                    "rounded-lg px-3 py-2 max-w-[80%] break-words",
                                                    message.sender === 'user'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted'
                                                )}
                                            >
                                                <p className="text-sm">{message.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-8 h-8">
                                                <AvatarFallback><Bot size={18} /></AvatarFallback>
                                            </Avatar>
                                            <div className="rounded-lg px-3 py-2 bg-muted flex items-center">
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="p-4 border-t flex-shrink-0">
                                <form onSubmit={handleSubmit} className="flex gap-2">
                                    <Input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Pergunte qualquer coisa..."
                                        autoComplete="off"
                                        disabled={isLoading}
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
