'use client';

import { useUser } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProfilePage() {
  const { appUser, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>A carregar perfil...</p>
      </div>
    );
  }

  if (!appUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Utilizador não encontrado.</p>
         <Button asChild className="mt-4">
            <Link href="/dashboard">Voltar à Página Principal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Perfil de Utilizador</CardTitle>
          <CardDescription>
            As suas informações pessoais e de conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Nome de Exibição</h3>
            <p>{appUser.displayName}</p>
          </div>
          <div>
            <h3 className="font-semibold">Email</h3>
            <p>{appUser.email}</p>
          </div>
          <div>
            <h3 className="font-semibold">Tipo de Conta</h3>
            <p>{appUser.role}</p>
          </div>
          {/* A lógica de personalização do perfil será implementada aqui. */}
        </CardContent>
      </Card>
       <Button asChild className="mt-4">
          <Link href="/dashboard">Voltar à Página Principal</Link>
      </Button>
    </div>
  );
}
