
'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GitBranch, Undo2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import MigrationTool from '@/components/migration-tool';
import RevertGraduationTool from '@/components/revert-graduation-tool';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MigrationPage() {
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
                                <GitBranch className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Ferramentas de Ano Letivo</h1>
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
                    <div className="container space-y-8">
                       <MigrationTool fromYear={2025} toYear={2026} />
                       
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Undo2 className="h-5 w-5 text-destructive" />
                                    Reverter Formatura de Turma
                                </CardTitle>
                                <CardDescription>
                                    Esta ferramenta move uma turma de formandos da base de dados de "Ex-Alunos" de volta para "Alunos". Use esta função para corrigir formaturas acidentais ou para editar dados de um aluno antes de o formar novamente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <RevertGraduationTool />
                            </CardContent>
                        </Card>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
