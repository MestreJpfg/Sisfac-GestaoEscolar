
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Dices, Heart, Star, Sword, Wand2, Sparkles, Book, Scroll, Shield, Search, Space, Swords, Info, Droplet, Wind, ShieldCheck, ShieldOff } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { gamebooks, type Gamebook, type StoryNode, type Choice, type Spell, type Combat } from '@/lib/gamebooks';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';


type GameState = 'setup' | 'playing' | 'end' | 'combat' | 'test_luck';

interface PlayerStats {
    skill: number;
    stamina: number;
    luck: number;
}

interface CurrentCombat {
    enemyName: string;
    player: PlayerStats;
    enemy: PlayerStats;
    canFlee: boolean;
    fleeTo: string | number | null;
}

interface CombatRoundResult {
    playerRoll: number;
    enemyRoll: number;
    playerAttack: number;
    enemyAttack: number;
    winner: 'player' | 'enemy' | 'draw';
    damage: number;
    isLucky: boolean | null;
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
    const [currentCombat, setCurrentCombat] = useState<CurrentCombat | null>(null);
    const [combatRoundResult, setCombatRoundResult] = useState<CombatRoundResult | null>(null);
    const [combatLog, setCombatLog] = useState<string[]>([]);
    const [luckTest, setLuckTest] = useState<Choice | null>(null);
    const [hasTestedLuckThisRound, setHasTestedLuckThisRound] = useState(false);


    const processNode = useCallback((nodeId: string | number, book: Gamebook | null = selectedBook) => {
        if (!book) return;
        const node = book.nodes[nodeId];
        if (!node) {
            console.error(`Node ${'${nodeId}'} not found!`);
            return;
        }

        setCurrentNodeId(nodeId);
        let currentStamina = playerStats.stamina;

        if (node.staminaChange) {
            currentStamina += node.staminaChange;
            setPlayerStats(prev => ({...prev, stamina: Math.max(0, prev.stamina + node.staminaChange!)}));
            toast({ title: `${'${book.player_stats.stamina_name}'} alterada em ${'${node.staminaChange}'}!` });
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

        if (node.event === 'combat' && node.combat) {
            setCurrentCombat({
                enemyName: node.combat.enemy,
                player: { ...playerStats },
                enemy: { skill: node.combat.skill, stamina: node.combat.stamina, luck: 0 },
                canFlee: node.combat.can_flee || false,
                fleeTo: node.combat.flee_to || null
            });
            setCombatLog([`Você encontra: ${'${node.combat.enemy}'}!`]);
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

    }, [selectedBook, playerStats, toast]);

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
        setCombatLog([]);
        setCombatRoundResult(null);
        setCurrentCombat(null);
        processNode('start', book);
    }, [processNode]);


    const handleChoice = useCallback((choice: Choice) => {
        processNode(choice.to);
    }, [processNode]);
    
    const handleFlee = () => {
        if (!currentCombat || !currentCombat.fleeTo || !selectedBook) return;
        toast({ title: "Fuga!", description: "Você escapa do combate.", variant: "destructive"});
        setCurrentCombat(null);
        setCombatRoundResult(null);
        processNode(currentCombat.fleeTo);
    };

    const handleCombatRound = () => {
        if (!currentCombat) return;

        const playerRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;
        const enemyRoll = Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1;

        const playerAttack = playerRoll + currentCombat.player.skill;
        const enemyAttack = enemyRoll + currentCombat.enemy.skill;

        let winner: 'player' | 'enemy' | 'draw';
        let newLog = [`Você rolou ${'${playerRoll}'} (Força de Ataque ${'${playerAttack}'})`, `O inimigo rolou ${'${enemyRoll}'} (Força de Ataque ${'${enemyAttack}'})`];
        
        let newEnemyStamina = currentCombat.enemy.stamina;
        let newPlayerStamina = playerStats.stamina;

        if (playerAttack > enemyAttack) {
            winner = 'player';
            newLog.push(`Você venceu a ronda!`);
            newEnemyStamina -= 2;
        } else if (enemyAttack > playerAttack) {
            winner = 'enemy';
            newLog.push(`Você perdeu a ronda e levou 2 de dano.`);
            newPlayerStamina -= 2;
        } else {
            winner = 'draw';
            newLog.push(`Empate! Ninguém se feriu.`);
        }
        
        setCombatLog(prev => [...prev, ...newLog]);
        setHasTestedLuckThisRound(false);

        const result: CombatRoundResult = { playerRoll, enemyRoll, playerAttack, enemyAttack, winner, damage: 2, isLucky: null };
        setCombatRoundResult(result);
        
        setCurrentCombat(prev => prev ? ({ ...prev, enemy: {...prev.enemy, stamina: newEnemyStamina }}) : null);
        setPlayerStats(prev => ({...prev, stamina: newPlayerStamina }));

        if (newEnemyStamina <= 0) {
            setTimeout(() => resolveCombat(true), 1500);
        } else if (newPlayerStamina <= 0) {
             setTimeout(() => resolveCombat(false), 1500);
        }
    };
    
    const handleTestLuckInCombat = () => {
        if (!combatRoundResult || !currentCombat) return;

        const diceRoll1 = Math.floor(Math.random() * 6) + 1;
        const diceRoll2 = Math.floor(Math.random() * 6) + 1;
        const totalRoll = diceRoll1 + diceRoll2;
        
        const isSuccess = totalRoll <= playerStats.luck;
        const newLuck = Math.max(0, playerStats.luck - 1);
        setPlayerStats(prev => ({ ...prev, luck: newLuck }));
        setHasTestedLuckThisRound(true);

        let newEnemyStamina = currentCombat.enemy.stamina;
        let newPlayerStamina = playerStats.stamina;
        let logMessage = '';

        if (combatRoundResult.winner === 'player') {
            if (isSuccess) {
                logMessage = "Sorte! Você causa dano extra! (Total 4)";
                newEnemyStamina -= 2; // -2 base + -2 extra
            } else {
                logMessage = "Azar! O seu golpe foi fraco! (Total 1)";
                newEnemyStamina += 1; // +1 porque o dano base foi 2, agora é 1
            }
             setCurrentCombat(prev => prev ? ({ ...prev, enemy: {...prev.enemy, stamina: newEnemyStamina }}) : null);
        } else if (combatRoundResult.winner === 'enemy') {
             if (isSuccess) {
                logMessage = "Sorte! Você amorteceu o golpe! (Total 1)";
                newPlayerStamina += 1; // +1 porque o dano base foi 2, agora é 1
            } else {
                logMessage = "Azar! Você levou dano extra! (Total 3)";
                newPlayerStamina -= 1;
            }
             setPlayerStats(prev => ({...prev, stamina: newPlayerStamina }));
        }

        setCombatLog(prev => [...prev, `Teste de Sorte... rolou ${'${totalRoll}'} (precisava de ${'${playerStats.luck}'}). ${'${logMessage}'}`]);
        setCombatRoundResult(prev => prev ? ({ ...prev, isLucky: isSuccess }) : null);

        if (newEnemyStamina <= 0) {
            setTimeout(() => resolveCombat(true), 1500);
        } else if (newPlayerStamina <= 0) {
             setTimeout(() => resolveCombat(false), 1500);
        }
    };

    const resolveCombat = (playerWon: boolean) => {
        if (!selectedBook?.nodes[currentNodeId].combat) return;

        const combatNode = selectedBook.nodes[currentNodeId].combat!;
        setCurrentCombat(null);
        setCombatRoundResult(null);

        if (playerWon) {
             toast({ title: "Vitória!", description: `Você derrotou ${'${combatNode.enemy}'}!` });
             processNode(combatNode.success.to);
        } else {
            setPlayerStats(prev => ({ ...prev, stamina: 0 }));
            toast({ variant: 'destructive', title: "Derrota!", description: `Você foi derrotado por ${'${combatNode.enemy}'}!` });
            processNode(combatNode.failure.to);
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
            title: `Teste de Sorte: ${'${isSuccess ? \'Sucesso!\' : \'Falha!\'}'}`,
            description: `Você rolou ${'${totalRoll}'} (precisava de ${'${playerStats.luck}'} ou menos). ${'${resultText}'}`,
        });

        setLuckTest(null);
        processNode(resultNodeId);
    };


    const restartGame = () => {
        setGameState('setup');
        setSelectedBook(null);
        setCurrentNodeId('start');
        setCombatLog([]);
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
        
        if (gameState === 'combat' && currentCombat) {
             return (
                <div className="flex flex-col h-full animate-fade-in">
                    <h2 className="text-2xl font-bold text-center mb-4 text-destructive">Combate!</h2>
                    <div className="grid grid-cols-2 gap-4 text-center mb-4">
                        <Card>
                            <CardHeader><CardTitle>Você</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <p><span className="font-bold">{selectedBook?.player_stats.skill_name}:</span> {currentCombat.player.skill}</p>
                                <p><span className="font-bold">{selectedBook?.player_stats.stamina_name}:</span> {playerStats.stamina}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>{currentCombat.enemyName}</CardTitle></CardHeader>
                            <CardContent className="space-y-2">
                                <p><span className="font-bold">{selectedBook?.player_stats.skill_name}:</span> {currentCombat.enemy.skill}</p>
                                <p><span className="font-bold">{selectedBook?.player_stats.stamina_name}:</span> {currentCombat.enemy.stamina}</p>
                            </CardContent>
                        </Card>
                    </div>
                    <ScrollArea className="flex-grow border rounded-md p-2 mb-4 h-32 bg-muted/50">
                        <div className="text-sm space-y-1">
                            {combatLog.map((log, i) => <p key={i}>{log}</p>)}
                        </div>
                    </ScrollArea>
                    <div className="mt-auto space-y-2">
                         {combatRoundResult === null ? (
                            <Button className="w-full" onClick={handleCombatRound}>
                                <Dices className="mr-2 h-4 w-4" /> Rolar Dados (Atacar)
                            </Button>
                         ) : (
                             <>
                                {combatRoundResult.winner === 'player' && !hasTestedLuckThisRound && playerStats.luck > 0 && (
                                     <Button className="w-full" variant="outline" onClick={handleTestLuckInCombat}>
                                        <Star className="mr-2 h-4 w-4 text-yellow-400" /> Testar a Sorte (Causar Dano Extra)
                                    </Button>
                                )}
                                {combatRoundResult.winner === 'enemy' && !hasTestedLuckThisRound && playerStats.luck > 0 && (
                                     <Button className="w-full" variant="outline" onClick={handleTestLuckInCombat}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-yellow-400" /> Testar a Sorte (Reduzir Dano)
                                    </Button>
                                )}
                                <Button className="w-full" onClick={() => setCombatRoundResult(null)}>Próxima Ronda</Button>
                             </>
                         )}
                         {currentCombat.canFlee && (
                            <Button className="w-full" variant="destructive" onClick={handleFlee}>Tentar Fugir</Button>
                         )}
                    </div>
                </div>
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
                <ScrollArea className="prose prose-lg dark:prose-invert max-w-none mb-6 whitespace-pre-wrap font-serif flex-grow pr-4">
                    {currentNode.text}
                </ScrollArea>

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
                                        <ScrollArea className="h-48">
                                          {inventory.length > 0 ? inventory.map(item => <p key={item} className="p-2 bg-muted/50 rounded-md">{item}</p>) : <p className="text-muted-foreground">Mochila vazia.</p>}
                                        </ScrollArea>
                                    </TabsContent>
                                    <TabsContent value="spells" className="mt-4">
                                        <ScrollArea className="h-48">
                                          <div className="space-y-3">
                                            {selectedBook.spells.length > 0 ? selectedBook.spells.map(spell => (
                                                <div key={spell.name} className="text-sm">
                                                    <p className="font-bold flex items-center gap-2"><Wand2 className="h-4 w-4 text-purple-400" />{spell.name}</p>
                                                    <p className="text-xs text-muted-foreground pl-6">{spell.description}</p>
                                                </div>
                                            )) : <p className="text-sm text-muted-foreground">Nenhum feitiço conhecido.</p>}
                                          </div>
                                        </ScrollArea>
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
                <p className="flex items-center gap-2 font-semibold"><Icon className={`h-5 w-5 ${'${color}'}`} />{label}</p>
                <p className="font-mono text-lg">{value} / {maxValue}</p>
            </div>
            <Progress value={percentage} indicatorClassName={
                percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
            }/>
        </div>
    )
}

    

    