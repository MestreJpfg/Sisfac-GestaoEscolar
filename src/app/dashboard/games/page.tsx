
'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Gamepad2, Play, BookOpen, Wind, Sparkles } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const games = [
    {
        title: "BOLA MALUCA",
        description: "Incline o seu dispositivo para mover a esfera azul. Colete os orbes amarelos e evite os vermelhos o máximo de tempo que conseguir!",
        href: "/dashboard/games/bola-maluca",
        icon: <Gamepad2 className="w-16 h-16 text-muted-foreground" />,
    },
    {
        title: "AVENTURAS FANTÁSTICAS",
        description: "Embarque numa aventura interativa com histórias pré-definidas. As suas escolhas moldam a história. Que caminho irá seguir?",
        href: "/dashboard/games/aventuras-fantasticas",
        icon: <BookOpen className="w-16 h-16 text-muted-foreground" />,
    },
    {
        title: "GERADOR DE AVENTURAS (IA)",
        description: "Crie a sua própria aventura! Descreva uma história ou envie um ficheiro e deixe a IA construir um mundo para si.",
        href: "/dashboard/games/gerador-de-aventuras",
        icon: <Sparkles className="w-16 h-16 text-muted-foreground" />,
    }
];

export default function GamesHubPage() {
    const router = useRouter();
    
    return (
        <AuthGuard>
            <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="container flex h-16 items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Central de Jogos</h1>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <ThemeToggle />
                            <UserNav />
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col items-center p-4 sm:p-8">
                    <div className="w-full max-w-4xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {games.map((game) => (
                                <Card key={game.title} className="flex flex-col overflow-hidden">
                                     <div className="aspect-video bg-muted flex items-center justify-center">
                                         {game.icon}
                                    </div>
                                    <CardHeader>
                                        <CardTitle>{game.title}</CardTitle>
                                        <CardDescription>{game.description}</CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto">
                                        <Button className="w-full" onClick={() => router.push(game.href)}>
                                            <Play className="mr-2 h-4 w-4" />
                                            Jogar
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
