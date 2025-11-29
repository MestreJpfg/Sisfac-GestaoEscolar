
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2, Sparkles, Wand2, Rocket, Search } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdventureInput, generateAdventureStep } from '@/ai/flows/adventure-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type GameState = 'setup' | 'playing' | 'loading' | 'end';

interface StorySegment {
    story: string;
    choices: string[];
    isEnd: boolean;
}

export default function AventurasFantasticasPage() {
    const router = useRouter();
    const [gameState, setGameState] = useState<GameState>('setup');
    const [storyHistory, setStoryHistory] = useState<string[]>([]);
    const [currentSegment, setCurrentSegment] = useState<StorySegment | null>(null);
    const [genre, setGenre] = useState('Fantasia');
    const [character, setCharacter] = useState('um bravo cavaleiro em busca de glória');
    const [error, setError] = useState<string | null>(null);

    const startGame = useCallback(async () => {
        setGameState('loading');
        setError(null);
        setStoryHistory([]);

        try {
            const input: AdventureInput = { genre, character };
            const result = await generateAdventureStep(input);
            setStoryHistory([result.story]);
            setCurrentSegment(result);
            setGameState('playing');
        } catch (err) {
            console.error(err);
            setError('Não foi possível iniciar a aventura. Por favor, tente novamente.');
            setGameState('setup');
        }
    }, [genre, character]);

    const handleChoice = useCallback(async (choice: string) => {
        setGameState('loading');
        setError(null);

        try {
            const input: AdventureInput = {
                genre,
                character,
                previousStory: storyHistory.join('\n\n'),
                choice,
            };
            const result = await generateAdventureStep(input);
            setStoryHistory(prev => [...prev, result.story]);
            setCurrentSegment(result);
            if (result.isEnd) {
                setGameState('end');
            } else {
                setGameState('playing');
            }
        } catch (err) {
            console.error(err);
            setError('Não foi possível continuar a aventura. Por favor, tente novamente.');
            setGameState('playing'); // Volta para o estado anterior
        }
    }, [genre, character, storyHistory]);

    const restartGame = () => {
        setGameState('setup');
        setCurrentSegment(null);
        setStoryHistory([]);
        setError(null);
    };

    const renderGameContent = () => {
        switch (gameState) {
            case 'setup':
                return (
                    <div className="text-center animate-fade-in space-y-6">
                        <h2 className="text-3xl font-bold">Prepare a sua Aventura</h2>
                        <p className="text-muted-foreground">Escolha o género e descreva o seu personagem para começar.</p>
                        
                        <div className="space-y-4 text-left max-w-md mx-auto">
                            <div>
                                <Label className="text-lg font-semibold mb-2 block">Género da Aventura</Label>
                                <RadioGroup defaultValue={genre} onValueChange={setGenre} className="grid grid-cols-3 gap-4">
                                    <div><RadioGroupItem value="Fantasia" id="g-fantasy" className="peer sr-only" /><Label htmlFor="g-fantasy" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Wand2 className="mb-3 h-6 w-6" />Fantasia</Label></div>
                                    <div><RadioGroupItem value="Ficção Científica" id="g-scifi" className="peer sr-only" /><Label htmlFor="g-scifi" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Rocket className="mb-3 h-6 w-6" />Ficção</Label></div>
                                    <div><RadioGroupItem value="Mistério" id="g-mystery" className="peer sr-only" /><Label htmlFor="g-mystery" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Search className="mb-3 h-6 w-6" />Mistério</Label></div>
                                </RadioGroup>
                            </div>

                            <div>
                                <Label htmlFor="character-desc" className="text-lg font-semibold mb-2 block">O seu Personagem</Label>
                                <Textarea id="character-desc" value={character} onChange={(e) => setCharacter(e.target.value)} placeholder="Ex: um detetive cínico, um pirata espacial audacioso..." />
                            </div>
                        </div>

                        <Button size="lg" onClick={startGame}>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Começar Aventura
                        </Button>
                    </div>
                );
            case 'loading':
                return (
                    <div className="text-center animate-pulse">
                        <Loader2 className="h-16 w-16 mx-auto animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">A tecer os fios do destino...</p>
                    </div>
                );
            case 'playing':
            case 'end':
                return (
                    <div className="animate-fade-in w-full">
                        <div className="prose prose-lg dark:prose-invert max-w-none mb-8 whitespace-pre-wrap font-serif">
                            {currentSegment?.story}
                        </div>
                        {gameState === 'end' ? (
                            <div className="text-center space-y-4">
                                <p className="text-2xl font-bold text-primary">FIM DA AVENTURA</p>
                                <Button onClick={restartGame}>Jogar Novamente</Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {currentSegment?.choices.map((choice, index) => (
                                    <Button key={index} variant="outline" className="w-full justify-start text-left h-auto py-3" onClick={() => handleChoice(choice)}>
                                        {choice}
                                    </Button>
                                ))}
                            </div>
                        )}
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
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/games')}>
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

                <main className="flex-1 flex flex-col items-center p-4 sm:p-8">
                    <Card className="w-full max-w-3xl flex-grow">
                        <CardContent className="p-6 h-full flex items-center justify-center">
                            {renderGameContent()}
                            {error && <p className="text-destructive mt-4">{error}</p>}
                        </CardContent>
                    </Card>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
