
'use client';

import { useState, useCallback, useMemo, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Dices, Heart, Star, Sword, Wand2, Sparkles, Loader2, Upload, Paperclip } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { generateAdventureStep, type AdventureStep, type PlayerState } from '@/ai/flows/adventure-flow';
import * as pdfjs from 'pdfjs-dist';

// Configure o worker do pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


type GameState = 'setup' | 'playing' | 'loading' | 'end';

const INITIAL_PLAYER_STATS: PlayerState = {
    skill: 10,
    stamina: 20,
    luck: 10,
    inventory: ["Mochila", "Adaga"],
    storyContext: "Início da aventura.",
};

export default function GeneratedAdventurePage() {
    const router = useRouter();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [gameState, setGameState] = useState<GameState>('setup');
    const [adventurePrompt, setAdventurePrompt] = useState('');
    const [currentStep, setCurrentStep] = useState<AdventureStep | null>(null);
    
    const [playerState, setPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATS);
    const [initialPlayerState, setInitialPlayerState] = useState<PlayerState>(INITIAL_PLAYER_STATS);


    const startGame = async (prompt: string) => {
        if (!prompt.trim()) {
            toast({ variant: 'destructive', title: 'Prompt em falta', description: 'Por favor, descreva a sua aventura.' });
            return;
        }
        setGameState('loading');
        setPlayerState(INITIAL_PLAYER_STATS);
        setInitialPlayerState(INITIAL_PLAYER_STATS);
        
        try {
            const nextStep = await generateAdventureStep({
                playerState: INITIAL_PLAYER_STATS,
                playerAction: `Iniciar a aventura com a seguinte premissa: ${prompt}`,
                systemPrompt: prompt,
            });
            setCurrentStep(nextStep);
            setGameState('playing');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro da IA', description: 'Não foi possível gerar a aventura. Tente novamente.' });
            setGameState('setup');
        }
    };
    
    const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        if (file.type === 'application/pdf') {
            reader.onload = async (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                if (!arrayBuffer) return;

                toast({ title: 'A processar PDF...', description: 'A extrair o texto do ficheiro.' });
                try {
                    const loadingTask = pdfjs.getDocument(new Uint8Array(arrayBuffer));
                    const pdf = await loadingTask.promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => ('str' in item) ? item.str : '').join(' ');
                        fullText += pageText + '\n\n';
                    }
                    setAdventurePrompt(fullText);
                    toast({ title: 'PDF Carregado!', description: 'O conteúdo do ficheiro foi extraído para a área de texto.' });
                } catch (error) {
                    console.error('Error parsing PDF:', error);
                    toast({ variant: 'destructive', title: 'Erro ao Ler PDF', description: 'Não foi possível extrair o texto deste PDF.' });
                }
            };
            reader.readAsArrayBuffer(file);
        } else if (file.type.startsWith('text/')) {
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setAdventurePrompt(text);
                toast({ title: 'Ficheiro de Texto Carregado', description: 'O conteúdo do ficheiro foi carregado para a área de texto.' });
            };
            reader.readAsText(file);
        } else {
            toast({ variant: 'destructive', title: 'Tipo de Ficheiro Inválido', description: 'Por favor, envie um ficheiro .pdf, .txt ou .md.' });
        }
         // Reset file input to allow re-uploading the same file
        if (event.target) {
            event.target.value = '';
        }
    };

    const handleChoice = async (choiceText: string) => {
        setGameState('loading');
        
        try {
            const nextStep = await generateAdventureStep({
                playerState,
                playerAction: choiceText,
                systemPrompt: adventurePrompt
            });
            
            let newStamina = playerState.stamina;
            if (nextStep.status_update?.dano_recebido) {
                 newStamina = playerState.stamina - nextStep.status_update.dano_recebido;
                 toast({
                    title: `Energia Alterada!`,
                    description: `Você ${nextStep.status_update.dano_recebido > 0 ? 'perdeu' : 'ganhou'} ${Math.abs(nextStep.status_update.dano_recebido)} pontos.`,
                    variant: nextStep.status_update.dano_recebido > 0 ? 'destructive' : 'default'
                });
            }

            let newInventory = [...playerState.inventory];
            if (nextStep.status_update?.item_adicionado) {
                newInventory.push(nextStep.status_update.item_adicionado);
                 toast({ title: "Item Adicionado!", description: nextStep.status_update.item_adicionado });
            }
            if (nextStep.status_update?.item_removido) {
                newInventory = newInventory.filter(item => item !== nextStep.status_update.item_removido);
                toast({ variant: "destructive", title: "Item Perdido!", description: nextStep.status_update.item_removido });
            }
            
            setPlayerState(prev => ({
                ...prev,
                stamina: newStamina,
                inventory: newInventory,
                storyContext: nextStep.narrativa
            }));

            setCurrentStep(nextStep);
            
            if (nextStep.game_over || newStamina <= 0) {
                setGameState('end');
            } else {
                setGameState('playing');
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro da IA', description: 'Não foi possível processar a sua escolha.' });
            setGameState('playing');
        }
    };

    const restartGame = () => {
        setGameState('setup');
        setCurrentStep(null);
        setAdventurePrompt('');
    };
    
    const renderGameContent = () => {
        if (gameState === 'setup') {
            return (
                <div className="text-center animate-fade-in space-y-4 sm:space-y-6 flex flex-col h-full items-center justify-center">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold">Gerador de Aventuras</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">Descreva a aventura que você quer criar ou importe um ficheiro de texto.</p>
                    </div>
                    
                     <div className="w-full max-w-lg mx-auto space-y-2 flex-1 flex flex-col">
                        <Label htmlFor="adventure-prompt" className="text-left">A sua ideia de aventura:</Label>
                        <Textarea
                            id="adventure-prompt"
                            value={adventurePrompt}
                            onChange={(e) => setAdventurePrompt(e.target.value)}
                            placeholder="Exemplo: 'Crie uma aventura de fantasia sombria numa floresta assombrada, onde o objetivo é encontrar uma flor rara que cura qualquer doença. O perigo principal são criaturas da sombra e armadilhas antigas.'"
                            className="flex-1 text-base min-h-[150px] sm:min-h-[200px]"
                        />
                        <p className="text-xs text-muted-foreground text-left">Dica: Descreva o tema, o objetivo principal e os tipos de perigos que o jogador deve enfrentar para uma melhor experiência.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center w-full max-w-lg">
                        <Button onClick={() => startGame(adventurePrompt)} size="lg" className="w-full sm:w-auto">
                            <Sparkles className="mr-2 h-4 w-4" /> Gerar Aventura
                        </Button>
                        <Button variant="outline" size="lg" onClick={() => fileInputRef.current?.click()} className="w-full sm:w-auto">
                           <Upload className="mr-2 h-4 w-4" /> Importar de Ficheiro
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.md,.pdf" />
                    </div>
                </div>
            );
        }

        if (gameState === 'loading') {
            return (
                <div className="flex flex-col items-center justify-center h-full animate-fade-in text-center">
                    <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground">A IA está a forjar o seu destino...</p>
                </div>
            )
        }

        if (!currentStep) return <div>Erro ao carregar a história.</div>;
        
        const isEndNode = currentStep.game_over || playerState.stamina <= 0;
        
        return (
            <div className="flex flex-col h-full animate-fade-in">
                <ScrollArea className="prose prose-lg dark:prose-invert max-w-none mb-6 whitespace-pre-wrap font-serif flex-grow pr-4">
                    {currentStep.narrativa}
                </ScrollArea>

                {isEndNode ? (
                     <div className="mt-auto pt-4 text-center space-y-4 border-t">
                        <p className="text-2xl font-bold text-primary">{playerState.stamina <= 0 ? "VOCÊ MORREU" : "FIM DA AVENTURA"}</p>
                        <Button onClick={restartGame}>Criar Nova Aventura</Button>
                    </div>
                ) : (
                    <div className="mt-auto space-y-3 pt-4 border-t">
                        {currentStep.opcoes?.map((choice, index) => (
                            <Button key={index} variant="outline" className="w-full justify-start text-left h-auto py-3 gap-2 whitespace-normal" onClick={() => handleChoice(choice.texto)}>
                                <span>{choice.texto}</span>
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        );
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
                                <Sparkles className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gerador de Aventuras</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col md:flex-row p-4 sm:p-6 md:p-8 gap-6 container">
                    {gameState !== 'setup' && (
                        <Card className="w-full md:w-80 lg:w-96 flex-shrink-0 animate-fade-in-left">
                            <CardHeader>
                                <CardTitle>Ficha do Aventureiro</CardTitle>
                                <CardDescription>Os seus atributos e equipamentos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="stats" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="stats"><Heart className="h-4 w-4" /></TabsTrigger>
                                        <TabsTrigger value="inventory"><Sword className="h-4 w-4" /></TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="stats" className="mt-4 space-y-4">
                                        <StatItem icon={Sword} label="Habilidade" value={playerState.skill} maxValue={initialPlayerState.skill} color="text-red-500" />
                                        <StatItem icon={Heart} label="Energia" value={playerState.stamina} maxValue={initialPlayerState.stamina} color="text-green-500" />
                                        <StatItem icon={Star} label="Sorte" value={playerState.luck} maxValue={initialPlayerState.luck} color="text-yellow-500" />
                                    </TabsContent>
                                    <TabsContent value="inventory" className="mt-4 space-y-2 text-sm">
                                        <ScrollArea className="h-48">
                                          {playerState.inventory.length > 0 ? playerState.inventory.map(item => <p key={item} className="p-2 bg-muted/50 rounded-md">{item}</p>) : <p className="text-muted-foreground">Mochila vazia.</p>}
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="flex-grow flex flex-col">
                        <CardContent className="p-4 sm:p-6 w-full flex-grow flex flex-col">
                           {renderGameContent()}
                        </CardContent>
                    </Card>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}

function StatItem({ icon: Icon, label, value, maxValue, color }: { icon: React.ElementType, label: string, value: number, maxValue: number, color: string }) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <p className="flex items-center gap-2 font-semibold"><Icon className={`h-5 w-5 ${color}`} />{label}</p>
                <p className="font-mono text-lg">{value} / {maxValue}</p>
            </div>
            <Progress value={percentage} indicatorClassName={
                percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }/>
        </div>
    )
}
