
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import ClassListGenerator from '@/components/class-list-generator';

export default function ClassesPage() {
    const router = useRouter();
    const firestore = useFirestore();

    const studentsQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'alunos'), orderBy('nome'));
    }, [firestore]);

    const { data: students, isLoading: isDataLoading } = useCollection(studentsQuery);

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
                    <div className="container flex justify-center">
                        {isDataLoading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-muted-foreground">A carregar dados dos alunos...</p>
                            </div>
                        ) : (
                           <ClassListGenerator allStudents={students || []} />
                        )}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
