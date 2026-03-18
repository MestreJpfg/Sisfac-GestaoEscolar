
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import DatabaseManager from '@/components/database-manager';
import { NotificationCenter } from '@/components/notification-center';

// A página agora confia que o acesso foi garantido pela dashboard.
export default function DatabasePage() {
    const router = useRouter();

    // Não há mais verificações de permissão no cliente.
    // As regras do Firestore protegerão os dados se um utilizador não autorizado aceder diretamente.
    
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
                                <Database className="h-6 w-6 text-primary" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão da Base de Dados</h1>
                            </div>
                        </div>
                        <div className="flex flex-1 items-center justify-end space-x-4">
                            <nav className="flex items-center space-x-1">
                                <NotificationCenter />
                                <ThemeToggle />
                                <UserNav />
                            </nav>
                        </div>
                    </div>
                </header>

                <main className="flex-1 py-8">
                    <div className="container">
                       <DatabaseManager />
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
