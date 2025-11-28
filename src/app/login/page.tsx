
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l-2.333 2.333c-.933-.853-2.133-1.467-3.573-1.467-3.067 0-5.547 2.533-5.547 5.6s2.48 5.6 5.547 5.6c3.467 0 4.933-2.6 5.2-4.027h-5.2v-3.28z" fill="#FFC107"/>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l-2.333 2.333c-.933-.853-2.133-1.467-3.573-1.467-3.067 0-5.547 2.533-5.547 5.6s2.48 5.6 5.547 5.6c3.467 0 4.933-2.6 5.2-4.027h-5.2v-3.28z" fill="#FF3D00"/>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l-2.333 2.333c-.933-.853-2.133-1.467-3.573-1.467-3.067 0-5.547 2.533-5.547 5.6s2.48 5.6 5.547 5.6c3.467 0 4.933-2.6 5.2-4.027h-5.2v-3.28z" fill="#4CAF50"/>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l-2.333 2.333c-.933-.853-2.133-1.467-3.573-1.467-3.067 0-5.547 2.533-5.547 5.6s2.48 5.6 5.547 5.6c3.467 0 4.933-2.6 5.2-4.027h-5.2v-3.28z" fill="#1976D2"/>
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
        // User already exists, check if profile is complete
        const userData = userDoc.data();
        if (userData?.profileCompleted) {
            router.push('/dashboard');
        } else {
            // This case handles users who signed up but didn't finish the profile page
            router.push('/profile'); 
        }
    } else {
        // This is a new user (likely via Google Sign-In)
        const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || [];
        const isAdmin = user.email && adminEmails.includes(user.email);

        const newUserData = {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Novo Utilizador',
            email: user.email,
            profileId: isAdmin ? 'Administrador' : 'Aluno', // Default profile
            customPermissions: [],
            createdAt: new Date().toISOString(),
            photoURL: user.photoURL || null,
            profileCompleted: false, // New users MUST complete their profile
        };
    
        await setDoc(userDocRef, newUserData);
        router.push('/profile'); // Always redirect new users to complete their profile
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
            // Check if the user's email is associated with a Google account
            const methods = await fetchSignInMethodsForEmail(auth, data.email);
            if (methods.includes('google.com')) {
                title = "Conta Google Detectada";
                description = "Este email está associado a um login com Google. Por favor, utilize o botão 'Entrar com Google'.";
            }
          } catch (fetchError) {
             // This can happen if the email doesn't exist at all.
             // Keep the generic "invalid credentials" message in this case.
          }
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
