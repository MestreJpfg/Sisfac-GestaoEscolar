
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Play, Repeat, Trophy, Gamepad2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


// --- Game Configuration ---
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 50;
const ITEM_SIZE = 20;
const POWERUP_SIZE = 25;
const NUM_ENEMIES = 3;
const ENEMY_SPEED_BASE = 1;
const ENEMY_SPEED_INCREMENT = 0.1;
const SENSITIVITY = 0.5;
const POWERUP_DURATION = 5000; // 5 seconds
const POWERUP_SPAWN_SCORE_INTERVAL = 5;

// --- Type Definitions ---
interface Vector {
    x: number;
    y: number;
}

interface GameObject {
    position: Vector;
    velocity: Vector;
    size: number;
    element?: HTMLDivElement | null;
}

interface PowerUpGameObject extends GameObject {
    active: boolean;
}

type GameStatus = 'permissions' | 'ready' | 'playing' | 'gameOver';

// --- Main Game Component ---
export default function GamesPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    // --- Refs for Game Objects, Elements & Animation ---
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number>();
    const lastTimeRef = useRef<number>(0);
    const gameTimeStartRef = useRef<number>(0);
    
    const playerRef = useRef<GameObject>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: PLAYER_SIZE });
    const enemiesRef = useRef<GameObject[]>([]);
    const itemRef = useRef<GameObject>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: ITEM_SIZE });
    const powerUpRef = useRef<PowerUpGameObject>({ position: { x: -100, y: -100 }, velocity: { x: 0, y: 0 }, size: POWERUP_SIZE, active: false });

    const originalVelocitiesRef = useRef<Vector[]>([]);
    const isPowerUpActiveRef = useRef<boolean>(false);
    const powerUpTimeoutRef = useRef<NodeJS.Timeout>();


    // --- State for React Rendering ---
    const [status, setStatus] = useState<GameStatus>('permissions');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [time, setTime] = useState(0);
    const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [isNewHighScore, setIsNewHighScore] = useState(false);

    // Refs for DOM elements to avoid re-querying
    const playerElementRef = useRef<HTMLDivElement>(null);
    const itemElementRef = useRef<HTMLDivElement>(null);
    const powerUpElementRef = useRef<HTMLDivElement>(null);
    const enemyElementsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (playerElementRef.current) playerRef.current.element = playerElementRef.current;
        if (itemElementRef.current) itemRef.current.element = itemElementRef.current;
        if (powerUpElementRef.current) powerUpRef.current.element = powerUpElementRef.current;
        enemiesRef.current.forEach((enemy, i) => {
            if (enemyElementsRef.current[i]) {
                enemy.element = enemyElementsRef.current[i];
            }
        });
    }, [status]); // Re-assign elements when status changes (and things re-render)

    // --- Load High Score ---
    useEffect(() => {
        const savedHighScore = localStorage.getItem('sensorRushHighScore');
        if (savedHighScore) {
            setHighScore(parseInt(savedHighScore, 10));
        }
    }, []);

    const resetGame = useCallback(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        
        const { width, height } = gameArea.getBoundingClientRect();
        
        setIsNewHighScore(false);
        if (powerUpTimeoutRef.current) clearTimeout(powerUpTimeoutRef.current);
        isPowerUpActiveRef.current = false;
        
        playerRef.current.position = { x: (width - PLAYER_SIZE) / 2, y: (height - PLAYER_SIZE) / 2 };
        playerRef.current.velocity = { x: 0, y: 0 };

        enemiesRef.current = Array.from({ length: NUM_ENEMIES }).map(() => {
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

        powerUpRef.current.position = { x: -100, y: -100 };
        powerUpRef.current.active = false;

        setScore(0);
        setTime(0);
        gameTimeStartRef.current = Date.now();
        lastTimeRef.current = Date.now();
    }, []);

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
        if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
            setPermissionState('granted');
            toast({ title: 'Acesso automático aos sensores.' });
            return;
        }

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
    };

    const vibrate = (pattern: number | number[]) => {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate(pattern);
            } catch (error) {
                console.warn("Vibration failed, possibly not supported in this context.", error);
            }
        }
    };

    const checkCollision = (obj1: GameObject, obj2: GameObject) => {
        const dx = (obj1.position.x + obj1.size / 2) - (obj2.position.x + obj2.size / 2);
        const dy = (obj1.position.y + obj1.size / 2) - (obj2.position.y + obj2.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size / 2 + obj2.size / 2);
    };
    
    // --- Game Loop ---
    const gameLoop = useCallback((currentTime: number) => {
        const gameArea = gameAreaRef.current;
        if (!gameArea || status !== 'playing') return;
        const { width, height } = gameArea.getBoundingClientRect();
        
        // --- Time Update for UI ---
        if (currentTime - lastTimeRef.current >= 1000) {
            setTime(Math.floor((currentTime - gameTimeStartRef.current) / 1000));
            lastTimeRef.current = currentTime;
        }
        
        // --- Update Positions ---
        const player = playerRef.current;
        player.position.x += player.velocity.x;
        player.position.y += player.velocity.y;
        if (player.position.x < 0) player.position.x = 0;
        if (player.position.x > width - player.size) player.position.x = width - player.size;
        if (player.position.y < 0) player.position.y = 0;
        if (player.position.y > height - player.size) player.position.y = height - player.size;

        const enemies = enemiesRef.current;
        enemies.forEach(e => {
            e.position.x += e.velocity.x;
            e.position.y += e.velocity.y;
            if (e.position.x <= 0 || e.position.x >= width - e.size) e.velocity.x *= -1;
            if (e.position.y <= 0 || e.position.y >= height - e.size) e.velocity.y *= -1;
        });

        // --- Check Collisions ---
        const item = itemRef.current;
        if (checkCollision(player, item)) {
            vibrate(50);
            const newScore = score + 1;
            setScore(newScore); // Triggers re-render for score display

            enemies.forEach(e => {
                const currentSpeed = Math.sqrt(e.velocity.x**2 + e.velocity.y**2);
                const newSpeed = currentSpeed + ENEMY_SPEED_INCREMENT;
                const speedMultiplier = newSpeed / currentSpeed;
                if (isFinite(speedMultiplier)) {
                    e.velocity.x *= speedMultiplier;
                    e.velocity.y *= speedMultiplier;
                }
            });

            item.position = {
                x: Math.random() * (width - item.size),
                y: Math.random() * (height - item.size),
            };
            
            if (!powerUpRef.current.active && !isPowerUpActiveRef.current && newScore > 0 && newScore % POWERUP_SPAWN_SCORE_INTERVAL === 0) {
                powerUpRef.current.position = {
                    x: Math.random() * (width - POWERUP_SIZE),
                    y: Math.random() * (height - POWERUP_SIZE),
                };
                powerUpRef.current.active = true;
            }
        }
        
        const powerUp = powerUpRef.current;
        if (powerUp.active && checkCollision(player, powerUp)) {
            vibrate([100, 30, 100]);
            powerUp.active = false;
            powerUp.position = { x: -100, y: -100 };
            
            if (!isPowerUpActiveRef.current) {
                isPowerUpActiveRef.current = true;
                originalVelocitiesRef.current = enemies.map(e => ({ ...e.velocity }));
                
                enemies.forEach(e => {
                    e.velocity.x *= 0.5;
                    e.velocity.y *= 0.5;
                });
                
                powerUpTimeoutRef.current = setTimeout(() => {
                    enemies.forEach((e, i) => {
                        e.velocity = originalVelocitiesRef.current[i];
                    });
                    isPowerUpActiveRef.current = false;
                }, POWERUP_DURATION);
            }
        }

        for (const enemy of enemies) {
            if (checkCollision(player, enemy)) {
                vibrate([200, 50, 200]);
                if (powerUpTimeoutRef.current) clearTimeout(powerUpTimeoutRef.current);
                isPowerUpActiveRef.current = false;
                setStatus('gameOver'); // Triggers re-render for game over screen
                return;
            }
        }
        
        // --- Direct DOM Manipulation for Performance ---
        if(player.element) {
            player.element.style.transform = `translate3d(${'${player.position.x}'}px, ${'${player.position.y}'}px, 0)`;
        }
        if(item.element) {
            item.element.style.transform = `translate3d(${'${item.position.x}'}px, ${'${item.position.y}'}px, 0)`;
        }
        if(powerUp.element) {
            powerUp.element.style.transform = `translate3d(${'${powerUp.position.x}'}px, ${'${powerUp.position.y}'}px, 0)`;
            powerUp.element.style.display = powerUp.active ? 'block' : 'none';
        }
        enemies.forEach(e => {
            if (e.element) {
                e.element.style.transform = `translate3d(${'${e.position.x}'}px, ${'${e.position.y}'}px, 0)`;
                const isSlow = isPowerUpActiveRef.current;
                e.element.style.backgroundColor = isSlow ? 'hsl(340, 50%, 70%)' : 'hsl(340, 100%, 50%)';
                e.element.style.boxShadow = `0 0 20px 8px ${'${isSlow ? \'hsl(340, 50%, 70%, 0.6)\' : \'hsl(340, 100%, 50%, 0.6)\'}'}`;
            }
        });


        animationFrameId.current = requestAnimationFrame(gameLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, score]); // Re-create loop function only when status or score changes.
    
    // --- Game State Effects ---
    useEffect(() => {
        if (status === 'playing') {
            gameTimeStartRef.current = Date.now();
            lastTimeRef.current = Date.now();
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
             if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
             }
             if (status === 'gameOver') {
                 if (score > highScore) {
                    setIsNewHighScore(true);
                    setHighScore(score);
                    localStorage.setItem('sensorRushHighScore', String(score));
                 }
             }
        }
        
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
            if (powerUpTimeoutRef.current) {
                clearTimeout(powerUpTimeoutRef.current);
            }
        };
    }, [status, gameLoop, score, highScore]);
    
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
            resetGame();
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
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')} className="border-purple-400/50 text-purple-400 hover:bg-purple-400/10 hover:text-purple-300">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="h-6 w-6 text-cyan-400" />
                                <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono hidden sm:block">Entretenimento</h1>
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
                    
                    <Card className="w-full max-w-sm h-[600px] bg-black/50 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
                        <CardContent 
                            ref={gameAreaRef} 
                            className="p-0 h-full w-full relative bg-grid"
                            style={{
                                '--grid-color': 'hsl(260 100% 50% / 0.15)',
                                '--grid-size': '30px',
                                backgroundImage: `
                                    linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
                                    linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)
                                `,
                                backgroundSize: 'var(--grid-size) var(--grid-size)',
                            } as React.CSSProperties}
                        >
                            {status !== 'permissions' && permissionState === 'granted' && (
                                <>
                                    {/* Player */}
                                    <div 
                                        ref={playerElementRef}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: playerRef.current.size,
                                            height: playerRef.current.size,
                                            backgroundColor: 'hsl(180, 100%, 50%)',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 15px 5px hsl(180, 100%, 50%, 0.7)',
                                            willChange: 'transform'
                                        }}/>
                                    
                                    {/* Item */}
                                    <div 
                                        ref={itemElementRef}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: itemRef.current.size,
                                            height: itemRef.current.size,
                                            backgroundColor: 'hsl(50, 100%, 50%)',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 15px 5px hsl(50, 100%, 50%, 0.7)',
                                            willChange: 'transform'
                                        }}/>

                                    {/* Power-up */}
                                    <div
                                        ref={powerUpElementRef}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            display: 'none',
                                            width: powerUpRef.current.size,
                                            height: powerUpRef.current.size,
                                            backgroundColor: 'hsl(190, 100%, 50%)', // Cyan
                                            borderRadius: '50%',
                                            boxShadow: '0 0 20px 8px hsl(190, 100%, 50%, 0.7)',
                                            willChange: 'transform'
                                        }}
                                        className="animate-pulse-strong"
                                     />
                                    
                                    {/* Enemies */}
                                    {enemiesRef.current.map((_, i) => (
                                        <div 
                                            key={i} 
                                            ref={el => enemyElementsRef.current[i] = el}
                                            style={{
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                width: ENEMY_SIZE,
                                                height: ENEMY_SIZE,
                                                backgroundColor: 'hsl(340, 100%, 50%)',
                                                borderRadius: '50%',
                                                boxShadow: `0 0 20px 8px hsl(340, 100%, 50%, 0.6)`,
                                                transition: 'background-color 0.3s, box-shadow 0.3s',
                                                willChange: 'transform'
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
                                        <Button onClick={requestPermissions} size="lg" variant="outline" className="text-yellow-300 border-yellow-300 hover:bg-yellow-300/10 hover:text-yellow-200">
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
                            <AlertDialogAction onClick={() => router.push('/dashboard')}>Voltar para a Dashboard</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AuthGuard>
    );
}

    