
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, type User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
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

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px" {...props}>
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.519-3.108-11.187-7.481l-6.571,4.819C9.656,39.663,16.318,44,24,44z" />
  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.572,36.348,48,30.655,48,24C48,22.659,47.862,21.35,47.611,20.083z" />
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

    if (userDoc.exists()) {
        const userData = userDoc.data();
        // User exists, check if profile is completed
        if (userData?.profileCompleted) {
            router.push('/dashboard');
        } else {
            router.push('/profile'); // Redirect to complete profile
        }
    } else {
        // New user, create their document
        const adminEmails = ['mestrejp@hotmail.com', 'mestrejpfg@gmail.com'];
        const isAdmin = user.email && adminEmails.includes(user.email);

        const newUserData = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Novo Utilizador',
            email: user.email,
            profileId: isAdmin ? 'Administrador' : 'Aluno',
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL,
            profileCompleted: false, // New users must complete their profile
        };
    
        // This is a non-blocking write, but for login flow, we might want to ensure it completes.
        // However, the redirect to /profile is the most important part.
        await setDoc(userDocRef, newUserData, { merge: true });
        router.push('/profile'); // Redirect new users to complete their profile
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
      let description = 'Ocorreu um erro ao tentar fazer login. Tente novamente.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          description = 'Credenciais inválidas. Verifique o seu email e senha.';
      }
      toast({ variant: 'destructive', title: 'Erro no Login', description: description });
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
      } else {
        toast({ variant: 'destructive', title: 'Erro no Login com Google', description: 'Não foi possível autenticar com o Google. Tente novamente.' });
      }
      setIsGoogleLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col">
        <main className="flex-grow flex flex-col items-center justify-center p-4">
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
