'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, NotebookText, Trophy } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import GradesManager from '@/components/grades-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GradeRanking from '@/components/grade-ranking';

export default function GradesPage() {
    const router = useRouter();
    
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
                                <Trophy className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Avaliações e Desempenho</h1>
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
                    <div className="container">
                       <Tabs defaultValue="ranking" className="w-full">
                          <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
                            <TabsTrigger value="lancamento">
                                <NotebookText className="mr-2 h-4 w-4" />
                                Lançamento de Notas
                            </TabsTrigger>
                            <TabsTrigger value="ranking">
                                <Trophy className="mr-2 h-4 w-4" />
                                Ranking por Média
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="lancamento" className="mt-6">
                            <GradesManager />
                          </TabsContent>
                          <TabsContent value="ranking" className="mt-6">
                            <GradeRanking />
                          </TabsContent>
                        </Tabs>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
