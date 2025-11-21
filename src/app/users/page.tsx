
'use client';

import { useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import UserManager from "@/components/user-manager";
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';

export default function UsersPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();

    // The query will now only run when firestore is available and after AuthGuard has confirmed authentication.
    const usersQuery = useMemo(() => {
        if (!firestore) return null; 
        return query(collection(firestore, 'users'), orderBy('name'));
    }, [firestore]);

    const { data: users, isLoading, error } = useCollection(usersQuery);

    useEffect(() => {
        // This effect now only handles authorization errors returned by the hook,
        // after AuthGuard has already done its job.
        if (error) {
            toast({
                variant: 'destructive',
                title: 'Acesso Negado',
                description: 'Não tem permissão para aceder a esta página.',
            });
            router.replace('/dashboard');
        }
    }, [error, router, toast]);

    // Show a loader if the user data is still loading or if an error has occurred and we are about to redirect.
    if (isLoading || error) {
      return (
        <AuthGuard>
          <div className="flex h-screen w-full items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </AuthGuard>
      );
    }
    
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
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Gestão de Utilizadores</h1>
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
                       {/* Since we show a loader above, we can be sure `users` is available here */}
                       {users && <UserManager initialUsers={users} />}
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
