
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Loader2, Dices, Heart, Star, Sword, Wand2, Sparkles, Book, Scroll, Shield, Search, Space, Swords, Info, Droplet, Wind } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { gamebooks, type Gamebook, type StoryNode, type Choice, type Spell, type Combat } from '@/lib/gamebooks';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type GameState = 'setup' | 'playing' | 'end' | 'combat' | 'test_luck';

interface PlayerStats {
    skill: number;
    stamina: number;
    luck: number;
}

export default function AventurasFantasticasPage() {
    const router = useRouter();
    const { toast } = useToast();

    // Game state
    const [gameState, setGameState] = useState<GameState>('setup');
    const [selectedBook, setSelectedBook] = useState<Gamebook | null>(null);
    const [currentNodeId, setCurrentNodeId] = useState<string | number>('start');
    
    // Player state
    const [playerStats, setPlayerStats] = useState<PlayerStats>({ skill: 0, stamina: 0, luck: 0 });
    const [initialPlayerStats, setInitialPlayerStats] = useState<PlayerStats>({ skill: 0, stamina: 0, luck: 0 });
    const [inventory, setInventory] = useState<string[]>([]);
    
    // Combat/Event state
    const [combatState, setCombatState] = useState<Combat | null>(null);
    const [luckTest, setLuckTest] = useState<Choice | null>(null);
    const [eventLog, setEventLog] = useState<string[]>([]);

    const startGame = useCallback((bookKey: keyof typeof gamebooks) => {
        const book = gamebooks[bookKey];
        setSelectedBook(book);
        setCurrentNodeId('start');

        const initialStats = {
            skill: book.player_stats.initial_skill,
            stamina: book.player_stats.initial_stamina,
            luck: book.player_stats.initial_luck
        };
        setPlayerStats(initialStats);
        setInitialPlayerStats(initialStats);
        setInventory(book.inventory || []);
        
        setGameState('playing');
        setEventLog([]);
        processNode('start', book);
    }, []);

    const processNode = useCallback((nodeId: string | number, book: Gamebook | null = selectedBook) => {
        if (!book) return;
        const node = book.nodes[nodeId];
        if (!node) {
            console.error(`Node ${nodeId} not found!`);
            return;
        }

        setCurrentNodeId(nodeId);
        let currentStamina = playerStats.stamina;

        // Apply effects of the new node
        if (node.staminaChange) {
            currentStamina += node.staminaChange;
            setPlayerStats(prev => ({...prev, stamina: Math.max(0, prev.stamina + node.staminaChange!)}));
            toast({ title: `${book.player_stats.stamina_name} alterada em ${node.staminaChange}!` });
        }
        if (node.getItems) {
            setInventory(prev => [...new Set([...prev, ...node.getItems!])]);
            toast({ title: "Itens Adicionados!", description: node.getItems?.join(', ') });
        }
         if (node.loseItems) {
            setInventory(prev => prev.filter(item => !node.loseItems!.includes(item)));
            toast({ variant: "destructive", title: "Itens Perdidos!", description: node.loseItems?.join(', ') });
        }
        
        if (currentStamina <= 0) {
            setGameState('end');
            return;
        }

        // Handle different event types
        if (node.event === 'combat' && node.combat) {
            setCombatState(node.combat);
            setGameState('combat');
        } else if (node.autoNavigate) {
             setTimeout(() => processNode(node.autoNavigate!.to, book), 500);
        } else if (node.event === 'test_luck' && node.choices) {
            setLuckTest(node.choices[0]);
            setGameState('test_luck');
        }
        else if (!node.choices || node.choices.length === 0) {
            setGameState('end');
        } else {
            setGameState('playing');
        }

    }, [selectedBook, playerStats.stamina, toast]);


    const handleChoice = useCallback((choice: Choice) => {
        processNode(choice.to);
    }, [processNode]);
    
    const resolveCombat = (playerWon: boolean) => {
        if (!combatState) return;
        setCombatState(null);
        if (playerWon) {
             toast({ title: "Vitória!", description: `Você derrotou ${combatState.enemy}!` });
             processNode(combatState.success.to);
        } else {
            setPlayerStats(prev => ({ ...prev, stamina: 0 }));
            toast({ variant: 'destructive', title: "Derrota!", description: `Você foi derrotado por ${combatState.enemy}!` });
            processNode(combatState.failure.to);
        }
    };
    
    const performLuckTest = () => {
        if (!luckTest) return;

        const diceRoll1 = Math.floor(Math.random() * 6) + 1;
        const diceRoll2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = diceRoll1 + diceRoll2;
        
        const isSuccess = totalRoll <= playerStats.luck;
        
        setPlayerStats(prev => ({ ...prev, luck: Math.max(0, prev.luck - 1) }));
        
        const resultNodeId = isSuccess ? luckTest.success.to : luckTest.failure.to;
        const resultText = isSuccess ? luckTest.success.text : luckTest.failure.text;

        toast({
            title: `Teste de Sorte: ${isSuccess ? 'Sucesso!' : 'Falha!'}`,
            description: `Você rolou ${totalRoll} (precisava de ${playerStats.luck} ou menos). ${resultText}`,
        });

        setLuckTest(null);
        processNode(resultNodeId);
    };


    const restartGame = () => {
        setGameState('setup');
        setSelectedBook(null);
        setCurrentNodeId('start');
        setEventLog([]);
    };

    const currentNode = useMemo((): StoryNode | null => {
        if (!selectedBook) return null;
        return selectedBook.nodes[currentNodeId];
    }, [selectedBook, currentNodeId]);

    const availableChoices = useMemo(() => {
        return currentNode?.choices?.filter(choice => {
            if (!choice.requires) return true;
            if (choice.requires.item && !inventory.includes(choice.requires.item)) return false;
            // Add spell requirement check here if needed
            return true;
        }) || [];
    }, [currentNode, inventory]);


    const renderGameContent = () => {
        if (gameState === 'setup') {
            return (
                <div className="text-center animate-fade-in space-y-6">
                    <h2 className="text-3xl font-bold">Podemos iniciar a aventura agora?</h2>
                    <p className="text-muted-foreground">Qual dos temas você escolhe?</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
                        <Card className="hover:border-primary transition-colors">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <Swords className="w-12 h-12 mb-4 text-primary" />
                                <h3 className="font-bold text-lg mb-2">{gamebooks.cidadelaDoCaos.theme}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{gamebooks.cidadelaDoCaos.title}</p>
                                <Button onClick={() => startGame('cidadelaDoCaos')}>Escolher</Button>
                            </CardContent>
                        </Card>
                        <Card className="hover:border-primary transition-colors">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <Space className="w-12 h-12 mb-4 text-primary" />
                                <h3 className="font-bold text-lg mb-2">{gamebooks.navePerdida.theme}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{gamebooks.navePerdida.title}</p>
                                <Button onClick={() => startGame('navePerdida')}>Escolher</Button>
                            </CardContent>
                        </Card>
                         <Card className="hover:border-primary transition-colors">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <Search className="w-12 h-12 mb-4 text-primary" />
                                <h3 className="font-bold text-lg mb-2">{gamebooks.detetiveNoir.theme}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{gamebooks.detetiveNoir.title}</p>
                                <Button onClick={() => startGame('detetiveNoir')}>Escolher</Button>
                            </CardContent>
                        </Card>
                         <Card className="hover:border-primary transition-colors">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <Wind className="w-12 h-12 mb-4 text-primary" />
                                <h3 className="font-bold text-lg mb-2">{gamebooks.desertoDeFerrugem.theme}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{gamebooks.desertoDeFerrugem.title}</p>
                                <Button onClick={() => startGame('desertoDeFerrugem')}>Escolher</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        }
        
        if (gameState === 'combat' && combatState) {
             return (
                <AlertDialog open={true}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Combate!</AlertDialogTitle>
                            <AlertDialogDescription>
                                Você enfrenta: <strong className="text-foreground">{combatState.enemy}</strong>
                                <div className="flex justify-around mt-4 text-center">
                                    <div><p className="font-bold">Sua Habilidade</p><p>{playerStats.skill}</p></div>
                                    <div><p className="font-bold">Habilidade do Inimigo</p><p>{combatState.skill}</p></div>
                                </div>
                                <div className="flex justify-around mt-2 text-center">
                                    <div><p className="font-bold">Sua Energia</p><p>{playerStats.stamina}</p></div>
                                    <div><p className="font-bold">Energia do Inimigo</p><p>{combatState.stamina}</p></div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                           <p className="text-xs text-muted-foreground mr-auto">A lógica de combate detalhada não está implementada. Escolha o resultado.</p>
                           <AlertDialogAction onClick={() => resolveCombat(true)}>Vencer</AlertDialogAction>
                           <AlertDialogCancel onClick={() => resolveCombat(false)}>Perder</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            );
        }

        if (gameState === 'test_luck' && luckTest) {
             return (
                <AlertDialog open={true}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Teste a sua Sorte!</AlertDialogTitle>
                            <AlertDialogDescription>
                                Você precisa rolar um número igual ou menor que a sua SORTE atual para ter sucesso. Sua sorte é <strong className="text-primary">{playerStats.luck}</strong>.
                                <br/>A sua SORTE diminuirá em 1 ponto após este teste.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                           <AlertDialogAction onClick={performLuckTest}>Rolar os Dados</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             )
        }

        if (!currentNode) return <div>Erro ao carregar a história.</div>;
        
        const isEndNode = (!currentNode.choices || availableChoices.length === 0) && !currentNode.event && !currentNode.autoNavigate;
        
        return (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="prose prose-lg dark:prose-invert max-w-none mb-6 whitespace-pre-wrap font-serif flex-grow overflow-y-auto pr-4">
                    {currentNode.text}
                </div>

                {isEndNode || playerStats.stamina <= 0 ? (
                     <div className="mt-auto pt-4 text-center space-y-4 border-t">
                        <p className="text-2xl font-bold text-primary">{playerStats.stamina <= 0 ? "VOCÊ MORREU" : "FIM DA AVENTURA"}</p>
                        <Button onClick={restartGame}>Jogar Novamente</Button>
                    </div>
                ) : (
                    <div className="mt-auto space-y-3 pt-4 border-t">
                        {availableChoices.map((choice, index) => (
                            <Button key={index} variant="outline" className="w-full justify-start text-left h-auto py-3 gap-2 whitespace-normal" onClick={() => handleChoice(choice)}>
                                {choice.type === 'spell' && <Wand2 className="h-4 w-4 text-purple-400 flex-shrink-0" />}
                                <span>{choice.text}</span>
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

                <main className="flex-1 flex flex-col md:flex-row p-4 sm:p-6 md:p-8 gap-6 container">
                    {gameState !== 'setup' && selectedBook && (
                        <Card className="w-full md:w-80 lg:w-96 flex-shrink-0 animate-fade-in-left">
                            <CardHeader>
                                <CardTitle>Ficha do Aventureiro</CardTitle>
                                <CardDescription>Os seus atributos e equipamentos.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="stats" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="stats"><Info className="h-4 w-4" /></TabsTrigger>
                                        <TabsTrigger value="inventory"><Sword className="h-4 w-4" /></TabsTrigger>
                                        <TabsTrigger value="spells"><Sparkles className="h-4 w-4" /></TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="stats" className="mt-4 space-y-4">
                                        <StatItem icon={Sword} label={selectedBook.player_stats.skill_name} value={playerStats.skill} maxValue={initialPlayerStats.skill} color="text-red-500" />
                                        <StatItem icon={selectedBook.id === 'desertoDeFerrugem' ? Droplet : Heart} label={selectedBook.player_stats.stamina_name} value={playerStats.stamina} maxValue={initialPlayerStats.stamina} color="text-green-500" />
                                        <StatItem icon={Star} label={selectedBook.player_stats.luck_name} value={playerStats.luck} maxValue={initialPlayerStats.luck} color="text-yellow-500" />
                                    </TabsContent>
                                    <TabsContent value="inventory" className="mt-4 space-y-2 text-sm">
                                        {inventory.length > 0 ? inventory.map(item => <p key={item} className="p-2 bg-muted/50 rounded-md">{item}</p>) : <p className="text-muted-foreground">Mochila vazia.</p>}
                                    </TabsContent>
                                    <TabsContent value="spells" className="mt-4 space-y-3">
                                        {selectedBook.spells.length > 0 ? selectedBook.spells.map(spell => (
                                            <div key={spell.name} className="text-sm">
                                                <p className="font-bold flex items-center gap-2"><Wand2 className="h-4 w-4 text-purple-400" />{spell.name}</p>
                                                <p className="text-xs text-muted-foreground pl-6">{spell.description}</p>
                                            </div>
                                        )) : <p className="text-sm text-muted-foreground">Nenhum feitiço conhecido.</p>}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="flex-grow flex flex-col">
                        <CardContent className="p-6 w-full flex-grow flex flex-col">
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
