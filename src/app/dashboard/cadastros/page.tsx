
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';
import AppFooter from '@/components/app-footer';

export default function CadastrosPage() {
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
                                <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Cadastros</h1>
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
                    <div className="container flex flex-col items-center justify-center text-center h-[50vh]">
                       <Construction className="h-16 w-16 text-primary mb-4" />
                       <h2 className="text-2xl font-bold">Página em Construção</h2>
                       <p className="text-muted-foreground mt-2">Esta funcionalidade estará disponível em breve.</p>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
