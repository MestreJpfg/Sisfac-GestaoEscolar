
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import AppFooter from '@/components/app-footer';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthSuccess = async (user: User) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de Conexão', description: 'Serviço de base de dados não encontrado.' });
      setIsLoading(false);
      return;
    }
  
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
  
    if (!userDoc.exists()) {
      setDocumentNonBlocking(userDocRef, {
        uid: user.uid,
        name: user.displayName || user.email,
        email: user.email,
        profileId: 'Aluno', // Perfil padrão
        customPermissions: [],
        createdAt: new Date().toISOString(),
        photoURL: user.photoURL,
      }, { merge: true });
    }
  
    router.push('/dashboard');
  };
  

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    if (!auth) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Serviço de autenticação não encontrado.' });
        setIsLoading(false);
        return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await handleAuthSuccess(userCredential.user);
    } catch (error: any) {
      let description = 'Ocorreu um erro ao tentar fazer login. Tente novamente.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = 'Credenciais inválidas. Verifique o seu email e senha.';
      }
      toast({ variant: 'destructive', title: 'Erro no Login', description: description });
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
            <Image src="/logoyuri.png" alt="Logo" width={100} height={100} className="mx-auto mb-4 rounded-md" />
            <CardTitle>Bem-vindo de Volta!</CardTitle>
            <CardDescription>Faça login para aceder ao Sistema de Gestão Escolar.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                        <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <div className="relative">
                            <FormControl>
                                <Input 
                                type={showPassword ? 'text' : 'password'} 
                                placeholder="Sua senha" 
                                {...field} 
                                />
                            </FormControl>
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar com Email'}
                </Button>
                </form>
            </Form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                Registre-se
                </Link>
            </p>
            </CardContent>
        </Card>
        </main>
        <AppFooter />
    </div>
  );
}
