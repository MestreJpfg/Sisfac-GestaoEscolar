
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2, Sparkles, Swords, Space, Detective } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent } from '@/components/ui/card';
import { gamebooks, type Gamebook, type StoryNode } from '@/lib/gamebooks';

type GameState = 'setup' | 'playing' | 'end';

export default function AventurasFantasticasPage() {
    const router = useRouter();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [selectedBook, setSelectedBook] = useState<Gamebook | null>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | number>('start');
    const [storyHistory, setStoryHistory] = useState<string[]>([]);

    const startGame = useCallback((bookKey: keyof typeof gamebooks) => {
        const book = gamebooks[bookKey];
        setSelectedBook(book);
        setCurrentNodeId('start');
        const startNode = book.nodes['start'];
        setStoryHistory([startNode.text]);
        setGameState('playing');
    }, []);

    const handleChoice = useCallback((nextNodeId: string | number) => {
        if (!selectedBook) return;

        const nextNode = selectedBook.nodes[nextNodeId];
        if (!nextNode) {
            console.error(`Node ${nextNodeId} not found!`);
            return;
        }

        setStoryHistory(prev => [...prev, nextNode.text]);
        setCurrentNodeId(nextNodeId);

        if (!nextNode.choices || nextNode.choices.length === 0) {
            setGameState('end');
        }
    }, [selectedBook]);

    const restartGame = () => {
        setGameState('setup');
        setSelectedBook(null);
        setCurrentNodeId('start');
        setStoryHistory([]);
    };

    const getCurrentNode = (): StoryNode | null => {
        if (!selectedBook) return null;
        return selectedBook.nodes[currentNodeId];
    };

    const renderGameContent = () => {
        const node = getCurrentNode();

        switch (gameState) {
            case 'setup':
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h2 className="text-3xl font-bold">Podemos iniciar a aventura agora?</h2>
                        <p className="text-muted-foreground">Qual dos temas você escolhe?</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                            <Card className="hover:border-primary transition-colors">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <Swords className="w-12 h-12 mb-4 text-primary" />
                                    <h3 className="font-bold text-lg mb-2">Fantasia Medieval</h3>
                                    <p className="text-sm text-muted-foreground mb-4">A Cidadela do Caos</p>
                                    <Button onClick={() => startGame('cidadelaDoCaos')}>Escolher</Button>
                                </CardContent>
                            </Card>
                            <Card className="hover:border-primary transition-colors">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <Space className="w-12 h-12 mb-4 text-primary" />
                                    <h3 className="font-bold text-lg mb-2">Ficção Científica</h3>
                                    <p className="text-sm text-muted-foreground mb-4">A Nave Perdida</p>
                                    <Button onClick={() => startGame('navePerdida')}>Escolher</Button>
                                </CardContent>
                            </Card>
                             <Card className="hover:border-primary transition-colors">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <Detective className="w-12 h-12 mb-4 text-primary" />
                                    <h3 className="font-bold text-lg mb-2">Mistério/Noir</h3>
                                    <p className="text-sm text-muted-foreground mb-4">O Detetive de Nova York</p>
                                    <Button onClick={() => startGame('detetiveNoir')}>Escolher</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                );
            
            case 'playing':
            case 'end':
                if (!node) return <div>Erro ao carregar a história.</div>;
                return (
                    <div className="animate-fade-in w-full">
                        <div className="prose prose-lg dark:prose-invert max-w-none mb-8 whitespace-pre-wrap font-serif">
                            {node.text}
                        </div>
                        {gameState === 'end' ? (
                            <div className="text-center space-y-4">
                                <p className="text-2xl font-bold text-primary">FIM DA AVENTURA</p>
                                <Button onClick={restartGame}>Jogar Novamente</Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {node.choices?.map((choice, index) => (
                                    <Button key={index} variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => handleChoice(choice.to)}>
                                        {choice.text}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                );

            case 'loading':
                 return (
                    <div className="text-center animate-pulse">
                        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">A preparar a aventura...</p>
                    </div>
                );
        }
    };

    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => gameState === 'setup' ? router.push('/dashboard/games') : restartGame()}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Aventuras Fantásticas</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                    <Card className="w-full max-w-3xl flex-grow flex items-center justify-center">
                        <CardContent className="p-6 w-full">
                            {renderGameContent()}
                        </CardContent>
                    </Card>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
