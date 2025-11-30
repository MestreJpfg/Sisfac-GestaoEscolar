
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
const ENEMY_SPEED_INCREMENT = 0.1;
const SENSITIVITY = 0.5;
const POWERUP_DURATION = 5000; // 5 seconds
const POWERUP_SPAWN_SCORE_INTERVAL = 5;
const ENEMY_SPAWN_INTERVAL = 20000; // 20 seconds

// --- Type Definitions ---
interface Vector {
    x: number;
    y: number;
}

interface GameObject {
    position: Vector;
    velocity: Vector;
    size: number;
}

interface PowerUpGameObject extends GameObject {
    active: boolean;
    color: string;
}

type GameStatus = 'permissions' | 'ready' | 'playing' | 'gameOver';

// --- Main Game Component ---
export default function BolaMalucaPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // --- Refs for Game Objects, Elements & Animation ---
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number>();
    
    // Refs for game state that changes every frame but shouldn't trigger re-renders
    const playerRef = useRef<GameObject>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: PLAYER_SIZE });
    const enemiesRef = useRef<GameObject[]>([]);
    const itemRef = useRef<GameObject>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: ITEM_SIZE });
    const originalVelocitiesRef = useRef<Map<GameObject, Vector>>(new Map());
    const gameTimeRef = useRef({ startTime: 0, lastTime: 0, lastEnemySpawnTime: 0 });
    const gameLoopRef = useRef<(currentTime: number) => void>();

    // --- State for React Rendering ---
    const [status, setStatus] = useState<GameStatus>('permissions');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [time, setTime] = useState(0);
    const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [isNewHighScore, setIsNewHighScore] = useState(false);
    const [isPowerUpActive, setIsPowerUpActive] = useState(false);
    const [powerUp, setPowerUp] = useState<PowerUpGameObject>({
        position: { x: -1000, y: -1000 },
        velocity: { x: 0, y: 0 },
        size: POWERUP_SIZE,
        active: false,
        color: 'hsl(190, 100%, 50%)',
    });
    // State to force re-renders for game visuals when necessary
    const [, setRenderTick] = useState(0);

    // --- Load High Score ---
    useEffect(() => {
        const savedHighScore = localStorage.getItem('bolaMalucaHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore, 10));
        }
    }, []);

    const endPowerUp = useCallback(() => {
        setIsPowerUpActive(false);
        // We don't need to deactivate the powerup in state here, as it's already visually gone.
        enemiesRef.current.forEach((enemy) => {
            const originalVelocity = originalVelocitiesRef.current.get(enemy);
            if (originalVelocity) {
                enemy.velocity = originalVelocity;
            }
        });
        originalVelocitiesRef.current.clear();
    }, []);

    // Effect to manage the power-up timer
    useEffect(() => {
        let powerUpTimeout: NodeJS.Timeout | undefined;
        if (isPowerUpActive) {
            powerUpTimeout = setTimeout(endPowerUp, POWERUP_DURATION);
        }
        return () => {
            if (powerUpTimeout) {
                clearTimeout(powerUpTimeout);
            }
        };
    }, [isPowerUpActive, endPowerUp]);
    
    const spawnEnemy = useCallback(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        const { width, height } = gameArea.getBoundingClientRect();
        
        const speed = ENEMY_SPEED_BASE;
        const newEnemy: GameObject = {
            position: {
                x: Math.random() * (width - ENEMY_SIZE),
                y: Math.random() * (height - ENEMY_SIZE),
            },
            velocity: {
                x: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                y: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
            },
            size: ENEMY_SIZE,
        };
        enemiesRef.current.push(newEnemy);
    }, []);


    const resetGame = useCallback((isStartingGame: boolean = false) => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        
        const { width, height } = gameArea.getBoundingClientRect();
        
        setIsNewHighScore(false);
        if (isPowerUpActive) endPowerUp();

        playerRef.current.position = { x: (width - PLAYER_SIZE) / 2, y: (height - PLAYER_SIZE) / 2 };
        playerRef.current.velocity = { x: 0, y: 0 };

        enemiesRef.current = Array.from({ length: INITIAL_NUM_ENEMIES }).map(() => {
            const speed = ENEMY_SPEED_BASE;
            return {
                position: {
                    x: Math.random() * (width - ENEMY_SIZE),
                    y: Math.random() * (height - ENEMY_SIZE),
                },
                velocity: {
                    x: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                    y: (Math.random() * speed + 0.5) * (Math.random() < 0.5 ? 1 : -1),
                },
                size: ENEMY_SIZE,
            }
        });
        
        itemRef.current.position = { 
            x: Math.random() * (width - ITEM_SIZE),
            y: Math.random() * (height - ITEM_SIZE),
        };

        setPowerUp(prev => ({ ...prev, position: { x: -1000, y: -1000 }, active: false }));

        setScore(0);
        setTime(0);

        if (isStartingGame) {
            gameTimeRef.current = { startTime: performance.now(), lastTime: performance.now(), lastEnemySpawnTime: performance.now() };
        }
        setRenderTick(tick => tick + 1);
    }, [isPowerUpActive, endPowerUp]);

    // --- Permissions and Initialization ---
     useEffect(() => {
        if (permissionState !== 'granted') return;
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;

        const checkLayoutReady = () => {
            const { width, height } = gameArea.getBoundingClientRect();
            if (width > 0 && height > 0) {
                resetGame();
                setStatus('ready');
            } else {
                requestAnimationFrame(checkLayoutReady);
            }
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

    const vibrate = useCallback((pattern: number | number[]) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (error) {
                console.warn("Vibration failed, possibly not supported in this context.", error);
            }
        }
    }, []);

    const checkCollision = (obj1: GameObject, obj2: GameObject) => {
        const dx = (obj1.position.x + obj1.size / 2) - (obj2.position.x + obj2.size / 2);
        const dy = (obj1.position.y + obj1.size / 2) - (obj2.position.y + obj2.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size / 2 + obj2.size / 2);
    };
    
    // --- Game Loop ---
    gameLoopRef.current = (currentTime: number) => {
        if (status !== 'playing') return;
        animationFrameId.current = requestAnimationFrame(gameLoopRef.current as FrameRequestCallback);
        
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        
        const { width, height } = gameArea.getBoundingClientRect();
        const timeState = gameTimeRef.current;
        if (timeState.startTime === 0) return;

        // --- Update Time ---
        if (currentTime - timeState.lastTime >= 1000) {
            setTime(Math.floor((currentTime - timeState.startTime) / 1000));
            timeState.lastTime = currentTime;
        }
        
        // --- Spawn new enemy ---
        if (currentTime - timeState.lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
            spawnEnemy();
            timeState.lastEnemySpawnTime = currentTime;
        }

        // --- Update Player Position ---
        const player = playerRef.current;
        player.position.x += player.velocity.x;
        player.position.y += player.velocity.y;
        if (player.position.x < 0) player.position.x = 0;
        if (player.position.x > width - player.size) player.position.x = width - player.size;
        if (player.position.y < 0) player.position.y = 0;
        if (player.position.y > height - player.size) player.position.y = height - player.size;

        // --- Update Enemy Positions ---
        enemiesRef.current.forEach(e => {
            e.position.x += e.velocity.x;
            e.position.y += e.velocity.y;
            if (e.position.x <= 0 || e.position.x >= width - e.size) e.velocity.x *= -1;
            if (e.position.y <= 0 || e.position.y >= height - e.size) e.velocity.y *= -1;
        });

        // --- Collision Checks ---

        // 1. Player-Item Collision
        if (checkCollision(player, itemRef.current)) {
            vibrate(50);
            const newScore = score + 1;
            setScore(newScore);
            
            // Spawn power-up based on score
            if (!isPowerUpActive && !powerUp.active && newScore > 0 && newScore % POWERUP_SPAWN_SCORE_INTERVAL === 0) {
                setPowerUp({
                    ...powerUp,
                    position: {
                        x: Math.random() * (width - POWERUP_SIZE),
                        y: Math.random() * (height - POWERUP_SIZE),
                    },
                    active: true,
                });
            }

            // Increase enemy speed only if power-up is not active
            if (!isPowerUpActive) {
                enemiesRef.current.forEach(e => {
                    const currentSpeed = Math.sqrt(e.velocity.x**2 + e.velocity.y**2);
                    const newSpeed = currentSpeed + ENEMY_SPEED_INCREMENT;
                    const speedMultiplier = newSpeed / currentSpeed;
                    if (isFinite(speedMultiplier)) {
                        e.velocity.x *= speedMultiplier;
                        e.velocity.y *= speedMultiplier;
                    }
                });
            }

            // Respawn item
            itemRef.current.position = {
                x: Math.random() * (width - itemRef.current.size),
                y: Math.random() * (height - itemRef.current.size),
            };
        }
        
        // 2. Player-PowerUp Collision
        if (powerUp.active && checkCollision(player, powerUp)) {
            vibrate([100, 30, 100]);
            
            // Make powerup disappear and activate the effect
            setPowerUp(prev => ({ ...prev, active: false, position: { x: -1000, y: -1000 } }));

            if (!isPowerUpActive) {
                setIsPowerUpActive(true);
                originalVelocitiesRef.current.clear();
                
                enemiesRef.current.forEach(e => {
                    originalVelocitiesRef.current.set(e, { ...e.velocity });
                    e.velocity.x *= 0.5;
                    e.velocity.y *= 0.5;
                });
            }
        }

        // 3. Player-Enemy Collision (MUST BE LAST)
        for (const enemy of enemiesRef.current) {
            if (checkCollision(player, enemy)) {
                vibrate([200, 50, 200]);
                setStatus('gameOver'); 
                return; // Stop the loop immediately
            }
        }
        
        setRenderTick(tick => tick + 1); // Trigger re-render to update visuals
    }; 
    
    // --- Game State Effects ---
    useEffect(() => {
        if (status === 'playing') {
            gameTimeRef.current.startTime = performance.now()
            animationFrameId.current = requestAnimationFrame(gameLoopRef.current as FrameRequestCallback);
        } else {
             if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
             }
             if (status === 'gameOver') {
                if (isPowerUpActive) endPowerUp();
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
    }, [status, score, highScore, isPowerUpActive, endPowerUp]);
    
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
    
    // --- Render ---
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
                                            transform: `translate3d(${playerRef.current.position.x}px, ${playerRef.current.position.y}px, 0)`
                                        }}/>
                                    
                                    {/* Item */}
                                    <div 
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
                                            transform: `translate3d(${itemRef.current.position.x}px, ${itemRef.current.position.y}px, 0)`
                                        }}/>

                                    {/* Power-up */}
                                    {powerUp.active && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: powerUp.size,
                                                height: powerUp.size,
                                                backgroundColor: powerUp.color,
                                                borderRadius: '50%',
                                                boxShadow: `0 0 20px 8px ${powerUp.color}a`,
                                                willChange: 'transform',
                                                transform: `translate3d(${powerUp.position.x}px, ${powerUp.position.y}px, 0)`
                                            }}
                                            className="animate-pulse-strong"
                                        />
                                    )}
                                    
                                    {/* Enemies */}
                                    {enemiesRef.current.map((enemy, i) => {
                                        const enemyColor = isPowerUpActive ? 'hsl(340, 50%, 70%)' : 'hsl(340, 100%, 50%)';
                                        return (
                                            <div 
                                                key={i} 
                                                style={{
                                                    position: 'absolute',
                                                    left: 0,
                                                    top: 0,
                                                    width: ENEMY_SIZE,
                                                    height: ENEMY_SIZE,
                                                    backgroundColor: enemyColor,
                                                    borderRadius: '50%',
                                                    boxShadow: `0 0 20px 8px ${enemyColor}99`,
                                                    transition: 'background-color 0.3s, box-shadow 0.3s',
                                                    willChange: 'transform',
                                                    transform: `translate3d(${enemy.position.x}px, ${enemy.position.y}px, 0)`
                                                }}/>
                                        )
                                    })}
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

    