'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminPage() {
  const { appUser, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && appUser?.role !== 'Admin') {
      router.push('/');
    }
  }, [appUser, isUserLoading, router]);

  if (isUserLoading || appUser?.role !== 'Admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>A verificar permissões...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Painel de Administração</CardTitle>
          <CardDescription>
            Gestão de utilizadores e outras configurações do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Bem-vindo, {appUser.displayName || 'Admin'}.</p>
          <p className="mt-4">Aqui poderá gerir os utilizadores da plataforma.</p>
          {/* A lógica de gestão de utilizadores será implementada aqui. */}
        </CardContent>
      </Card>
       <Button asChild className="mt-4">
          <Link href="/">Voltar à Página Principal</Link>
      </Button>
    </div>
  );
}
