
'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList, LayoutGrid, UserCog } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import ClassListGenerator from '@/components/class-list-generator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ClassEditManager from '@/components/class-edit-manager';

export default function ClassesPage() {
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
                                <LayoutGrid className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Turmas</h1>
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
                    <div className="container max-w-6xl">
                        <Tabs defaultValue="listas" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
                                <TabsTrigger value="listas" className="flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    Gerar Listas
                                </TabsTrigger>
                                <TabsTrigger value="editar" className="flex items-center gap-2">
                                    <UserCog className="h-4 w-4" />
                                    Editar Alunos / Turmas
                                </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="listas" className="animate-in fade-in-50">
                                <ClassListGenerator />
                            </TabsContent>
                            
                            <TabsContent value="editar" className="animate-in fade-in-50">
                                <ClassEditManager />
                            </TabsContent>
                        </Tabs>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
