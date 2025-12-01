
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play, Repeat, Trophy, Gamepad2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


// --- Game Configuration ---
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 50;
const ITEM_SIZE = 20;
const POWERUP_SIZE = 25;
const INITIAL_NUM_ENEMIES = 3;
const ENEMY_SPEED_BASE = 1;
const ENEMY_SPEED_INCREMENT = 0.05;
const SENSITIVITY = 0.5;
const ENEMY_SPAWN_INTERVAL = 20000; // 20 seconds
const POWERUP_SPAWN_INTERVAL = 10000; // 10 seconds
const POWERUP_EFFECT_DURATION = 5000; // 5 seconds

// --- Type Definitions ---
type GameStatus = 'permissions' | 'ready' | 'playing' | 'gameOver';

interface Vector {
    x: number;
    y: number;
}

interface GameObject {
    id: string;
    type: 'enemy' | 'powerup';
    position: Vector;
    velocity: Vector;
    size: number;
    color: string;
}

interface Player {
    position: Vector;
    velocity: Vector;
    size: number;
}

interface Collectible {
    position: Vector;
    size: number;
}


// --- Main Game Component ---
export default function BolaMalucaPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // --- Refs for Game Elements & Animation ---
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number>();
    
    // Refs for game state that changes every frame but shouldn't trigger re-renders
    const playerRef = useRef<Player>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: PLAYER_SIZE });
    const playerDivRef = useRef<HTMLDivElement>(null);

    const itemRef = useRef<Collectible>({ position: { x: -100, y: -100 }, size: ITEM_SIZE });
    const itemDivRef = useRef<HTMLDivElement>(null);
    
    const gameTimeRef = useRef({ startTime: 0, lastTime: 0, lastEnemySpawnTime: 0, lastPowerUpSpawnTime: 0 });

    // --- State for React Rendering ---
    const [status, setStatus] = useState<GameStatus>('permissions');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [time, setTime] = useState(0);
    const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
    const [isPowerUpActive, setIsPowerUpActive] = useState(false);


    // --- Load High Score ---
    useEffect(() => {
        const savedHighScore = localStorage.getItem('bolaMalucaHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore, 10));
        }
    }, []);
    
     const vibrate = useCallback((pattern: number | number[]) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (error) {
                console.warn("Vibration failed, possibly not supported in this context.", error);
            }
        }
    }, []);
    
    const getRandomHSLColor = () => {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 50%)`;
    };

    const spawnEnemy = useCallback(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        const { width, height } = gameArea.getBoundingClientRect();
        
        const speed = ENEMY_SPEED_BASE;
        const newEnemy: GameObject = {
            id: `enemy_${Date.now()}_${Math.random()}`,
            type: 'enemy',
            position: {
                x: Math.random() * (width - ENEMY_SIZE),
                y: Math.random() * (height - ENEMY_SIZE),
            },
            velocity: {
                x: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                y: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
            },
            size: ENEMY_SIZE,
            color: 'hsl(340, 100%, 50%)',
        };
        setGameObjects(prev => [...prev, newEnemy]);
    }, []);

    const spawnPowerUp = useCallback(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea || gameObjects.some(obj => obj.type === 'powerup')) return;
        const { width, height } = gameArea.getBoundingClientRect();

        const newPowerUp: GameObject = {
            id: `powerup_${Date.now()}`,
            type: 'powerup',
            position: {
                x: (width - POWERUP_SIZE) / 2,
                y: (height - POWERUP_SIZE) / 2,
            },
            velocity: { x: 0, y: 0 },
            size: POWERUP_SIZE,
            color: 'hsl(270, 100%, 60%)',
        };
        setGameObjects(prev => [...prev, newPowerUp]);
    }, [gameObjects]);
    
    const resetGame = useCallback((isStartingGame: boolean) => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        const { width, height } = gameArea.getBoundingClientRect();
        
        setIsNewHighScore(false);
        setIsPowerUpActive(false);

        playerRef.current.position = { x: (width - PLAYER_SIZE) / 2, y: (height - PLAYER_SIZE) / 2 };
        playerRef.current.velocity = { x: 0, y: 0 };

        setGameObjects(Array.from({ length: INITIAL_NUM_ENEMIES }).map((_, i) => {
            const speed = ENEMY_SPEED_BASE;
            return {
                id: `enemy_initial_${i}`,
                type: 'enemy',
                position: {
                    x: Math.random() * (width - ENEMY_SIZE),
                    y: Math.random() * (height - ENEMY_SIZE),
                },
                velocity: {
                    x: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                    y: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                },
                size: ENEMY_SIZE,
                color: 'hsl(340, 100%, 50%)',
            }
        }));
        
        itemRef.current.position = { 
            x: Math.random() * (width - ITEM_SIZE),
            y: Math.random() * (height - ITEM_SIZE),
        };
        
        setScore(0);
        setTime(0);

        if (isStartingGame) {
            const now = performance.now();
            gameTimeRef.current = { startTime: now, lastTime: now, lastEnemySpawnTime: now, lastPowerUpSpawnTime: now };
        }
    }, []);

     useEffect(() => {
        if (permissionState !== 'granted') return;
        
        const checkLayoutReady = () => {
            const gameArea = gameAreaRef.current;
            if (!gameArea || gameArea.getBoundingClientRect().width === 0) {
                 requestAnimationFrame(checkLayoutReady);
                 return;
            }
            resetGame(false);
            setStatus('ready');
        };

        checkLayoutReady();
    }, [permissionState, resetGame]);

    const requestPermissions = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    setPermissionState('granted');
                    toast({ title: 'Permissão concedida!', description: 'Prepare-se para jogar!' });
                } else {
                    setPermissionState('denied');
                    toast({ variant: 'destructive', title: 'Permissão negada.' });
                }
            } catch (error) {
                console.error('Erro ao pedir permissão:', error);
                setPermissionState('denied');
                toast({ variant: 'destructive', title: 'Erro ao pedir permissão.' });
            }
        } else {
            setPermissionState('granted');
        }
    };

    const checkCollision = (obj1: { position: Vector, size: number }, obj2: { position: Vector, size: number }) => {
        const dx = (obj1.position.x + obj1.size / 2) - (obj2.position.x + obj2.size / 2);
        const dy = (obj1.position.y + obj1.size / 2) - (obj2.position.y + obj2.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size / 2 + obj2.size / 2);
    };
    
    // --- Game Loop ---
    useEffect(() => {
        const gameLoop = () => {
            if (status !== 'playing') return;
        
            const gameArea = gameAreaRef.current;
            if (!gameArea) return;
            const { width, height } = gameArea.getBoundingClientRect();
            const timeState = gameTimeRef.current;
            const player = playerRef.current;
            
            // --- Update Time ---
            const currentTime = performance.now();
            if (currentTime - timeState.lastTime >= 1000) {
                setTime(prevTime => prevTime + 1);
                timeState.lastTime = currentTime;
            }
            
            // --- Spawn New Objects ---
            if (currentTime - timeState.lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
                spawnEnemy();
                timeState.lastEnemySpawnTime = currentTime;
            }
            if (currentTime - timeState.lastPowerUpSpawnTime > POWERUP_SPAWN_INTERVAL) {
                spawnPowerUp();
                timeState.lastPowerUpSpawnTime = currentTime;
            }

            // --- Update Player Position ---
            player.position.x += player.velocity.x;
            player.position.y += player.velocity.y;
            if (player.position.x < 0) player.position.x = 0;
            if (player.position.x > width - player.size) player.position.x = width - player.size;
            if (player.position.y < 0) player.position.y = 0;
            if (player.position.y > height - player.size) player.position.y = height - player.size;
            
            // Update visual elements via refs for performance
            if (playerDivRef.current) playerDivRef.current.style.transform = `translate3d(${player.position.x}px, ${player.position.y}px, 0)`;
            if (itemDivRef.current) itemDivRef.current.style.transform = `translate3d(${itemRef.current.position.x}px, ${itemRef.current.position.y}px, 0)`;

            // --- Update Game Object Positions ---
            setGameObjects(prevObjects => prevObjects.map(obj => {
                const newPos = { 
                    x: obj.position.x + obj.velocity.x,
                    y: obj.position.y + obj.velocity.y
                };
                const newVel = { ...obj.velocity };

                if (obj.type === 'enemy') {
                    if (newPos.x <= 0 || newPos.x >= width - obj.size) newVel.x *= -1;
                    if (newPos.y <= 0 || newPos.y >= height - obj.size) newVel.y *= -1;
                }
                
                let color = obj.color;
                if (obj.type === 'enemy' && isPowerUpActive) {
                    color = getRandomHSLColor();
                }

                return { ...obj, position: newPos, velocity: newVel, color };
            }));

            // --- Collision Checks ---

            // 1. Player-Item Collision (Score)
            if (checkCollision(player, itemRef.current)) {
                vibrate(50);
                const newScore = score + 1;
                setScore(newScore);

                setGameObjects(prevObjects => prevObjects.map(obj => {
                    if (obj.type !== 'enemy') return obj;
                    const currentSpeed = Math.sqrt(obj.velocity.x**2 + obj.velocity.y**2);
                    const newSpeed = currentSpeed + ENEMY_SPEED_INCREMENT;
                    const speedMultiplier = newSpeed / currentSpeed;
                    if (isFinite(speedMultiplier)) {
                        return {...obj, velocity: {x: obj.velocity.x * speedMultiplier, y: obj.velocity.y * speedMultiplier}};
                    }
                    return obj;
                }));
                
                itemRef.current.position = {
                    x: Math.random() * (width - itemRef.current.size),
                    y: Math.random() * (height - itemRef.current.size),
                };
            }
            
            // 2. Player-Game Object Collision (Enemies and Power-ups)
            for (const obj of gameObjects) {
                if (checkCollision(player, obj)) {
                    if (obj.type === 'powerup') {
                        vibrate(100);
                        setIsPowerUpActive(true);
                        setTimeout(() => setIsPowerUpActive(false), POWERUP_EFFECT_DURATION);
                        // Remove the collected power-up
                        setGameObjects(prev => prev.filter(o => o.id !== obj.id));
                        // Continue the loop to check other collisions in the same frame
                        continue; 
                    }
                    
                    if (obj.type === 'enemy') {
                        vibrate([200, 50, 200]);
                        setStatus('gameOver');
                        return; // Exit loop immediately on game over
                    }
                }
            }
            
            animationFrameId.current = requestAnimationFrame(gameLoop);
        };

        if (status === 'playing') {
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
             if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
             }
             if (status === 'gameOver') {
                 if (score > highScore) {
                    setIsNewHighScore(true);
                    setHighScore(score);
                    localStorage.setItem('bolaMalucaHighScore', String(score));
                 }
             }
        }
        
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, score, highScore, gameObjects, spawnEnemy, spawnPowerUp, vibrate, isPowerUpActive, resetGame]);
    
    // --- Sensor Listener Effect ---
    useEffect(() => {
        if (permissionState !== 'granted' || status !== 'playing') return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { beta, gamma } = event;
            if (beta === null || gamma === null) return;
            
            const vx = Math.max(-5, Math.min(5, gamma * SENSITIVITY));
            const vy = Math.max(-5, Math.min(5, beta * SENSITIVITY));
            
            playerRef.current.velocity = { x: vx, y: vy };
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [permissionState, status]);
    
    const startGame = () => {
        if (gameAreaRef.current && gameAreaRef.current.getBoundingClientRect().width > 0) {
            resetGame(true);
            setStatus('playing');
        } else {
            toast({ variant: 'destructive', title: 'Erro de Layout', description: 'Não foi possível iniciar o jogo. Tente novamente.' });
        }
    };
    
    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col bg-gray-900 text-gray-100">
                <header className="sticky top-0 z-40 w-full border-b border-purple-500/30 bg-gray-900/80 backdrop-blur">
                    <div className="container flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/games')} className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10 hover:text-purple-300">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="h-6 w-6 text-cyan-400" />
                                <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono hidden sm:block">BOLA MALUCA</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm flex justify-between items-center mb-4 font-mono px-2">
                         <div className="flex items-center gap-2 text-lg">
                            <Trophy className="h-5 w-5 text-yellow-400" />
                            <span>Score:</span>
                            <span className="font-bold text-xl text-yellow-400">{score}</span>
                        </div>
                         <div className="flex items-center gap-2 text-lg">
                            <span>Time:</span>
                            <span className="font-bold text-xl text-white">{time}s</span>
                        </div>
                    </div>
                    
                    <Card className="w-full max-w-sm aspect-[9/16] bg-black/50 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
                        <CardContent 
                            ref={gameAreaRef} 
                            className="p-0 h-full w-full relative bg-grid"
                            style={{
                                '--grid-color': 'hsl(260 100% 50% / 0.15)',
                                '--grid-size': '30px',
                            } as React.CSSProperties}
                        >
                            {status !== 'permissions' && permissionState === 'granted' && (
                                <>
                                    {/* Player */}
                                    <div 
                                        ref={playerDivRef}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: playerRef.current.size,
                                            height: playerRef.current.size,
                                            backgroundColor: 'hsl(180, 100%, 50%)',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 15px 5px hsl(180, 100%, 50%, 0.7)',
                                            willChange: 'transform',
                                            transform: `translate3d(${playerRef.current.position.x}px, ${playerRef.current.position.y}px, 0)`,
                                            display: status === 'playing' ? 'block' : 'none'
                                        }}/>
                                    
                                    {/* Item */}
                                    <div
                                        ref={itemDivRef}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: itemRef.current.size,
                                            height: itemRef.current.size,
                                            backgroundColor: 'hsl(50, 100%, 50%)',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 15px 5px hsl(50, 100%, 50%, 0.7)',
                                            willChange: 'transform',
                                            transform: `translate3d(${itemRef.current.position.x}px, ${itemRef.current.position.y}px, 0)`,
                                            display: status === 'playing' ? 'block' : 'none'
                                        }}/>

                                    {/* Game Objects (Enemies and Power-ups) */}
                                    {gameObjects.map((obj) => (
                                        <div 
                                            key={obj.id} 
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: obj.size,
                                                height: obj.size,
                                                backgroundColor: obj.color,
                                                borderRadius: '50%',
                                                boxShadow: `0 0 20px 8px ${obj.color}60`,
                                                willChange: 'transform',
                                                transition: 'background-color 0.3s ease',
                                                transform: `translate3d(${obj.position.x}px, ${obj.position.y}px, 0)`,
                                                animation: obj.type === 'powerup' ? 'pulse-strong 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                                            }}/>
                                    ))}
                                </>
                            )}
                            
                            <div className={cn("absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-500",
                                (status === 'playing') ? 'opacity-0 pointer-events-none' : 'opacity-100'
                            )}>
                                {status === 'permissions' && (
                                     <div className="text-center font-mono space-y-4 p-4">
                                        <h2 className="text-3xl font-bold text-cyan-400 tracking-widest">PERMISSÃO NECESSÁRIA</h2>
                                        <p className="text-purple-300">O jogo necessita de acesso aos sensores de movimento do seu dispositivo para funcionar.</p>
                                        <Button onClick={requestPermissions} size="lg" className="text-yellow-300 border-yellow-300 bg-yellow-300/10 hover:bg-yellow-300/20 hover:text-yellow-200">
                                            <Play className="mr-2 h-5 w-5" />
                                            Conceder Permissão
                                        </Button>
                                    </div>
                                )}
                                {status === 'ready' && (
                                    <div className="text-center font-mono space-y-4 p-4">
                                        <h2 className="text-4xl font-bold text-cyan-400 tracking-widest">BOLA MALUCA</h2>
                                        <p className="text-purple-300">Incline o seu dispositivo para mover a esfera azul.<br/>Colete os orbes amarelos e evite os vermelhos!</p>
                                        <p className="text-lg text-white">RECORDE: <span className="font-bold text-yellow-300">{highScore}</span></p>
                                        <Button onClick={startGame} size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                                            <Play className="mr-2 h-5 w-5" />
                                            Iniciar Jogo
                                        </Button>
                                    </div>
                                )}
                                {status === 'gameOver' && (
                                     <div className="text-center font-mono space-y-4 p-4">
                                        <h2 className="text-5xl font-bold text-red-500 tracking-widest">GAME OVER</h2>
                                        {isNewHighScore && <p className="text-2xl font-bold text-yellow-400 animate-pulse-strong">NOVO RECORDE!</p>}
                                        <p className="text-xl text-white">Score Final: <span className="font-bold text-yellow-300">{score}</span></p>
                                        <p className="text-lg text-white">Recorde: <span className="font-bold text-yellow-300">{highScore}</span></p>
                                        <Button onClick={startGame} size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                                            <Repeat className="mr-2 h-5 w-5" />
                                            Tentar Novamente
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </main>
                <AppFooter />
                 <AlertDialog open={permissionState === 'denied'}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Acesso aos Sensores Negado</AlertDialogTitle>
                            <AlertDialogDescription>
                                O jogo não pode funcionar sem acesso aos sensores de movimento. Por favor, ative a permissão nas configurações do seu navegador para esta página e atualize.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => router.push('/dashboard/games')}>Voltar para a Central de Jogos</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AuthGuard>
    );
}
