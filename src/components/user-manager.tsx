'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, orderBy, DocumentData, Query } from 'firebase/firestore';
import UserTable from './user-table';
import { ThemeToggle } from './theme-toggle';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';


export default function UserManager() {
  const firestore = useFirestore();
  const router = useRouter();

  // A query só é definida quando o firestore está disponível para evitar instabilidade.
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), orderBy('name'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection(usersQuery);

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-7xl mx-auto flex-1">
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="w-full flex items-start justify-between">
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                    Voltar ao Painel
                </Button>
              <div className="flex flex-col items-center text-center">
                <Image src="/logo.png" alt="Logo" width={80} height={80} className="rounded-md" priority />
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserNav />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary [text-shadow:0_2px_10px_hsl(var(--primary)/0.4)] font-headline mt-6">
              Gestão de Utilizadores
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              Visualize os utilizadores registados na plataforma.
            </p>
          </header>

          <div className="w-full">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A carregar utilizadores...</p>
              </div>
            ) : (
              <UserTable users={users || []} />
            )}
          </div>
        </div>
        <AppFooter />
      </main>
    </>
  );
}
