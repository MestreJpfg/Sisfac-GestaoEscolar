
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Smartphone, Zap, Move3d } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface MotionData {
    x: number | null;
    y: number | null;
    z: number | null;
}

interface OrientationData {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
}

const SensorCard = ({ title, data, unit, icon: Icon }: { title: string, data: { [key: string]: number | null }, unit: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {title}</CardTitle>
        </CardHeader>
        <CardContent>
            {Object.entries(data).map(([key, value]) => (
                <div key={key} className="text-lg font-bold flex justify-between">
                    <span className="text-muted-foreground">{key.toUpperCase()}:</span>
                    <span>{value !== null ? value.toFixed(2) : 'N/A'} {unit}</span>
                </div>
            ))}
        </CardContent>
    </Card>
);

export default function SensorsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [motion, setMotion] = useState<MotionData>({ x: null, y: null, z: null });
    const [orientation, setOrientation] = useState<OrientationData>({ alpha: null, beta: null, gamma: null });
    const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    
    useEffect(() => {
        const handleMotion = (event: DeviceMotionEvent) => {
            setMotion({
                x: event.acceleration?.x ?? null,
                y: event.acceleration?.y ?? null,
                z: event.acceleration?.z ?? null,
            });
        };

        const handleOrientation = (event: DeviceOrientationEvent) => {
            setOrientation({
                alpha: event.alpha,
                beta: event.beta,
                gamma: event.gamma,
            });
        };

        if (permissionState === 'granted') {
            window.addEventListener('devicemotion', handleMotion);
            window.addEventListener('deviceorientation', handleOrientation);
        }

        return () => {
            window.removeEventListener('devicemotion', handleMotion);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [permissionState]);

    const requestPermissions = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
            // Se a API de permissão não existir, assuma que a permissão é concedida (padrão em dispositivos Android e desktops)
            setPermissionState('granted');
            toast({
                title: 'Acesso automático aos sensores.',
                description: 'O seu navegador permite o acesso direto aos sensores do dispositivo.',
            });
            return;
        }

        try {
            const motionPermission = await (DeviceMotionEvent as any).requestPermission();
            const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();

            if (motionPermission === 'granted' && orientationPermission === 'granted') {
                setPermissionState('granted');
                toast({
                    title: 'Permissão concedida!',
                    description: 'A ler os dados dos sensores do dispositivo.',
                });
            } else {
                setPermissionState('denied');
                toast({
                    variant: 'destructive',
                    title: 'Permissão negada.',
                    description: 'Não é possível aceder aos sensores do dispositivo.',
                });
            }
        } catch (error) {
            console.error('Erro ao pedir permissão para os sensores:', error);
             setPermissionState('denied');
             toast({
                variant: 'destructive',
                title: 'Erro ao pedir permissão',
                description: 'Não foi possível solicitar acesso aos sensores.',
            });
        }
    };


    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Smartphone className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Sensores do Dispositivo</h1>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end space-x-4">
                            <nav className="flex items-center space-x-1">
                                <ThemeToggle />
                                <UserNav />
                            </nav>
                        </div>
                    </div>
                </header>

                <main className="flex-1 py-8">
                    <div className="container max-w-2xl">
                         <Card>
                            <CardHeader>
                                <CardTitle>Demonstração dos Sensores</CardTitle>
                                <CardDescription>
                                    Esta página mostra os dados em tempo real do acelerómetro e do giroscópio do seu dispositivo. 
                                    É necessária a sua permissão para aceder a estes dados, especialmente em dispositivos iOS.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {permissionState === 'prompt' && (
                                    <div className="text-center p-8 border-2 border-dashed rounded-lg">
                                        <h3 className="text-lg font-medium">Permissão Necessária</h3>
                                        <p className="text-muted-foreground mt-2 mb-4">Clique no botão abaixo para permitir que a aplicação aceda aos sensores do seu dispositivo.</p>
                                        <Button onClick={requestPermissions}>
                                            <Zap className="mr-2 h-4 w-4" />
                                            Pedir Permissão
                                        </Button>
                                    </div>
                                )}
                                {permissionState === 'denied' && (
                                    <div className="text-center text-destructive p-8 border-2 border-dashed border-destructive/50 rounded-lg">
                                        <h3 className="text-lg font-medium">Acesso Negado</h3>
                                        <p className="mt-2">Você negou o acesso aos sensores. Para usar esta funcionalidade, precisa de conceder a permissão nas configurações do seu navegador.</p>
                                    </div>
                                )}
                                {permissionState === 'granted' && (
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SensorCard 
                                            title="Acelerómetro" 
                                            data={{ x: motion.x, y: motion.y, z: motion.z }}
                                            unit="m/s²"
                                            icon={Move3d}
                                        />
                                        <SensorCard 
                                            title="Giroscópio" 
                                            data={{ alpha: orientation.alpha, beta: orientation.beta, gamma: orientation.gamma }}
                                            unit="°"
                                            icon={Smartphone}
                                        />
                                    </div>
                                )}
                            </CardContent>
                         </Card>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
