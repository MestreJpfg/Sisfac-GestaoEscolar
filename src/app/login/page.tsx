
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, type User, GoogleAuthProvider, signInWithPopup, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import AppFooter from '@/components/app-footer';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
      setIsGoogleLoading(false);
      return;
    }
  
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    const adminEmails = ['mestrejpfg@gmail.com', 'fortalezaem@gmail.com']; 
    const userEmail = user.email?.toLowerCase() || '';
    const shouldBeAdmin = adminEmails.includes(userEmail);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        const updates: any = {};
        
        if (!userData.createdAt) updates.createdAt = new Date().toISOString();
        
        // Sincronização prioritária para administradores
        if (shouldBeAdmin && userData.profileId !== 'Administrador') {
            updates.profileId = 'Administrador';
        }

        if (Object.keys(updates).length > 0) {
            await setDoc(userDocRef, updates, { merge: true });
        }
        
        if (userData?.profileCompleted || shouldBeAdmin) {
            router.push('/dashboard');
        } else {
            router.push('/profile'); 
        }
    } else {
        const newUserData = {
            uid: user.uid,
            name: user.displayName || userEmail.split('@')[0] || 'Novo Utilizador',
            email: userEmail,
            profileId: shouldBeAdmin ? 'Administrador' : 'Aluno',
            customPermissions: [],
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL || null,
            profileCompleted: false,
        };
    
        await setDoc(userDocRef, newUserData);
        router.push('/profile');
    }
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
      let title = 'Erro no Login';
      let description = 'Ocorreu um erro ao tentar fazer login. Tente novamente.';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = 'Credenciais inválidas. Verifique o seu email e senha.';
          
          try {
            const methods = await fetchSignInMethodsForEmail(auth, data.email);
            if (methods.includes('google.com')) {
                title = "Conta Google Detectada";
                description = "Este email está associado a um login com Google. Por favor, utilize o botão 'Entrar com Google'.";
            }
          } catch (fetchError) {}
      }
      toast({ variant: 'destructive', title, description });
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    if (!auth) {
        toast({ variant: 'destructive', title: 'Erro de Autenticação', description: 'Serviço de autenticação não encontrado.' });
        setIsGoogleLoading(false);
        return;
    }
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleAuthSuccess(result.user);
    } catch (error: any) {
      if ((error as any).code === 'auth/operation-not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Login com Google desativado',
          description: 'Este método de login precisa ser ativado na consola do Firebase.',
        });
      } else if ((error as any).code === 'auth/account-exists-with-different-credential') {
         toast({
          variant: 'destructive',
          title: 'Conta já existe',
          description: 'Já existe uma conta com este email, mas com um método de login diferente. Tente entrar com email e senha.',
        });
      } else {
        toast({ variant: 'destructive', title: 'Erro no Login com Google', description: 'Não foi possível autenticar com o Google. Tente novamente.' });
      }
      setIsGoogleLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col">
        <main className="flex-grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
            <Image src="/logoyuri.png" alt="Logo" width={100} height={100} className="mx-auto mb-4 rounded-md" />
            <CardTitle>Bem-vindo de Volta!</CardTitle>
            <CardDescription>Faça login para aceder ao Sistema de Gestão Escolar.</CardDescription>
            </CardHeader>
            <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar com Email'}
                </Button>
                </form>
            </Form>
             <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Ou continue com
                    </span>
                </div>
            </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Entrar com Google
            </Button>
             <p className="mt-6 text-center text-sm text-muted-foreground">
                Não tem uma conta?{' '}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                Crie uma aqui
                </Link>
            </p>
            </CardContent>
        </Card>
        </main>
        <AppFooter />
    </div>
  );
}
