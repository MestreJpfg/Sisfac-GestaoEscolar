'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Play, Repeat, Trophy } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


// --- Game Configuration ---
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 50;
const ITEM_SIZE = 20;
const NUM_ENEMIES = 3;
const ENEMY_SPEED_MIN = 1;
const ENEMY_SPEED_MAX = 2.5;
const SENSITIVITY = 0.5; // Player movement sensitivity

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

type GameStatus = 'permissions' | 'ready' | 'playing' | 'gameOver';

// --- Main Game Component ---
export default function SensorGamePage() {
    const router = useRouter();
    const { toast } = useToast();
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number>();
    const gameTimeStartRef = useRef<number>(0);
    
    // --- State Management ---
    const [status, setStatus] = useState<GameStatus>('permissions');
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(0);
    const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    
    const [player, setPlayer] = useState<GameObject>({
        position: { x: -100, y: -100 }, // Start off-screen
        velocity: { x: 0, y: 0 },
        size: PLAYER_SIZE
    });
    const [enemies, setEnemies] = useState<GameObject[]>([]);
    const [item, setItem] = useState<GameObject>({
        position: { x: -100, y: -100 }, // Start off-screen
        velocity: { x: 0, y: 0 },
        size: ITEM_SIZE
    });

    const resetGame = useCallback((width: number, height: number) => {
        setPlayer({
            position: { x: (width - PLAYER_SIZE) / 2, y: (height - PLAYER_SIZE) / 2 },
            velocity: { x: 0, y: 0 },
            size: PLAYER_SIZE,
        });

        setEnemies(Array.from({ length: NUM_ENEMIES }).map(() => ({
            position: {
                x: Math.random() * (width - ENEMY_SIZE),
                y: Math.random() * (height - ENEMY_SIZE),
            },
            velocity: {
                x: (Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + ENEMY_SPEED_MIN) * (Math.random() < 0.5 ? 1 : -1),
                y: (Math.random() * (ENEMY_SPEED_MAX - ENEMY_SPEED_MIN) + ENEMY_SPEED_MIN) * (Math.random() < 0.5 ? 1 : -1),
            },
            size: ENEMY_SIZE,
        })));
        
        setItem({
            position: { 
                x: Math.random() * (width - ITEM_SIZE),
                y: Math.random() * (height - ITEM_SIZE),
            },
            velocity: { x: 0, y: 0 },
            size: ITEM_SIZE,
        });

        setScore(0);
        setTime(0);
        gameTimeStartRef.current = 0;
    }, []);

    // --- Permissions and Initialization ---
    useEffect(() => {
        if (permissionState === 'granted') {
             setStatus('ready');
        }
    }, [permissionState]);

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
    
    // --- Game Loop ---
    const gameLoop = useCallback(() => {
        const gameArea = gameAreaRef.current;
        if (!gameArea) return;
        const { width, height } = gameArea.getBoundingClientRect();
        
        if (gameTimeStartRef.current > 0) {
            setTime(Math.floor((Date.now() - gameTimeStartRef.current) / 1000));
        }

        setPlayer(p => {
            let newX = p.position.x + p.velocity.x;
            let newY = p.position.y + p.velocity.y;
            if (newX < 0) newX = 0;
            if (newX > width - p.size) newX = width - p.size;
            if (newY < 0) newY = 0;
            if (newY > height - p.size) newY = height - p.size;
            return { ...p, position: { x: newX, y: newY } };
        });

        setEnemies(e_arr => e_arr.map(e => {
            let newX = e.position.x + e.velocity.x;
            let newY = e.position.y + e.velocity.y;
            let newVelX = e.velocity.x;
            let newVelY = e.velocity.y;
            if (newX <= 0 || newX >= width - e.size) newVelX *= -1;
            if (newY <= 0 || newY >= height - e.size) newVelY *= -1;
            return { ...e, position: { x: newX, y: newY }, velocity: { x: newVelX, y: newVelY }};
        }));
        
        setPlayer(p => {
            const gameArea = gameAreaRef.current;
            if (!gameArea) return p;
            const { width, height } = gameArea.getBoundingClientRect();

            if (checkCollision(p, item)) {
                vibrate(50);
                setScore(s => s + 1);
                setItem(i => ({
                    ...i,
                    position: {
                        x: Math.random() * (width - i.size),
                        y: Math.random() * (height - i.size),
                    }
                }));
            }

            for (const enemy of enemies) {
                if (checkCollision(p, enemy)) {
                    vibrate([200, 50, 200]);
                    setStatus('gameOver');
                    return p;
                }
            }
            return p;
        });

        animationFrameId.current = requestAnimationFrame(gameLoop);
    }, [item, enemies]);
    
    // --- Effects ---
    useEffect(() => {
        if (status === 'playing') {
            if (gameTimeStartRef.current === 0) {
                 gameTimeStartRef.current = Date.now();
            }
            animationFrameId.current = requestAnimationFrame(gameLoop);
        } else {
             if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
             }
             if (status === 'gameOver') {
                gameTimeStartRef.current = 0;
             }
        }
        
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [status, gameLoop]);
    
    useEffect(() => {
        if (permissionState !== 'granted' || status !== 'playing') return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            const { beta, gamma } = event;
            if (beta === null || gamma === null) return;
            
            const vx = Math.max(-5, Math.min(5, gamma * SENSITIVITY));
            const vy = Math.max(-5, Math.min(5, beta * SENSITIVITY));
            
            setPlayer(p => ({ ...p, velocity: { x: vx, y: vy } }));
        };

        window.addEventListener('deviceorientation', handleOrientation);
        return () => window.removeEventListener('deviceorientation', handleOrientation);
    }, [permissionState, status]);

    const checkCollision = (obj1: GameObject, obj2: GameObject) => {
        const dx = (obj1.position.x + obj1.size / 2) - (obj2.position.x + obj2.size / 2);
        const dy = (obj1.position.y + obj1.size / 2) - (obj2.position.y + obj2.size / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (obj1.size / 2 + obj2.size / 2);
    };
    
    const startGame = () => {
        const gameArea = gameAreaRef.current;
        if (gameArea) {
            const { width, height } = gameArea.getBoundingClientRect();
            if (width > 0 && height > 0) {
                resetGame(width, height);
                setStatus('playing');
            } else {
                toast({ variant: 'destructive', title: 'Erro de Layout', description: 'Não foi possível iniciar o jogo. Tente novamente.' });
            }
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
                                <Smartphone className="h-6 w-6 text-cyan-400" />
                                <h1 className="text-xl font-bold tracking-widest text-cyan-400 font-mono hidden sm:block">SENSOR RUSH</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col p-4">
                    <div className="w-full flex justify-between items-center mb-4 font-mono px-2">
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
                    
                    <Card className="w-full flex-1 bg-black/50 border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 overflow-hidden">
                        <CardContent ref={gameAreaRef} className="p-0 h-full w-full relative">
                            {status !== 'permissions' && permissionState === 'granted' && (
                                <>
                                    <div style={{
                                        position: 'absolute',
                                        left: player.position.x,
                                        top: player.position.y,
                                        width: player.size,
                                        height: player.size,
                                        backgroundColor: 'hsl(180, 100%, 50%)',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 15px 5px hsl(180, 100%, 50%, 0.7)',
                                        transition: 'left 0.05s linear, top 0.05s linear'
                                    }}/>
                                    
                                    <div style={{
                                        position: 'absolute',
                                        left: item.position.x,
                                        top: item.position.y,
                                        width: item.size,
                                        height: item.size,
                                        backgroundColor: 'hsl(50, 100%, 50%)',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 15px 5px hsl(50, 100%, 50%, 0.7)',
                                    }}/>

                                    {enemies.map((enemy, i) => (
                                        <div key={i} style={{
                                            position: 'absolute',
                                            left: enemy.position.x,
                                            top: enemy.position.y,
                                            width: enemy.size,
                                            height: enemy.size,
                                            backgroundColor: 'hsl(340, 100%, 50%)',
                                            borderRadius: '50%',
                                            boxShadow: '0 0 20px 8px hsl(340, 100%, 50%, 0.6)',
                                            transition: 'left 0.05s linear, top 0.05s linear'
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
                                        <h2 className="text-4xl font-bold text-cyan-400 tracking-widest">SENSOR RUSH</h2>
                                        <p className="text-purple-300">Incline o seu dispositivo para mover a esfera azul.<br/>Colete os orbes amarelos e evite os vermelhos!</p>
                                        <Button onClick={startGame} size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">
                                            <Play className="mr-2 h-5 w-5" />
                                            Iniciar Jogo
                                        </Button>
                                    </div>
                                )}
                                {status === 'gameOver' && (
                                     <div className="text-center font-mono space-y-4 p-4">
                                        <h2 className="text-5xl font-bold text-red-500 tracking-widest">GAME OVER</h2>
                                        <p className="text-xl text-white">Score Final: <span className="font-bold text-yellow-300">{score}</span></p>
                                         <p className="text-xl text-white">Tempo: <span className="font-bold">{time}s</span></p>
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
    