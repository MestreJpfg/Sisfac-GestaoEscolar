
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useUser, useAuth, useFirestore, useStorage, useDoc, useMemoFirebase } from '@/firebase';
import { updateProfile, signOut } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import AuthGuard from '@/components/auth-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, LogOut, Briefcase, Info, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const profileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  dateOfBirth: z.date().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  bio: z.string().max(200, 'A biografia não pode exceder 200 caracteres.').optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const formatPhoneNumber = (value: string) => {
    if (!value) return "";
    
    value = value.replace(/\D/g, '');
    value = value.substring(0, 11); // Limita a 11 dígitos (DDD + 9 dígitos)
    let formattedValue = '';

    if (value.length > 0) {
        formattedValue = `(${value.substring(0, 2)}`;
    }
    if (value.length > 2) {
        formattedValue = `(${value.substring(0, 2)}) ${value.substring(2, 7)}`;
    }
    if (value.length > 7) {
        formattedValue = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7)}`;
    }

    // Para números de 8 dígitos sem o nono dígito inicial
    if (value.length === 10) {
         formattedValue = `(${value.substring(0, 2)}) ${value.substring(2, 6)}-${value.substring(6, 10)}`;
    }
    if (value.length === 11) {
         formattedValue = `(${value.substring(0, 2)}) ${value.substring(2, 7)}-${value.substring(7, 11)}`;
    }


    return formattedValue;
};


export default function ProfilePage() {
    const { user } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const userDocRef = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);

    const { data: userProfile, isLoading: isUserProfileLoading } = useDoc(userDocRef);

    const profileDocRef = useMemoFirebase(() => {
        if (!userProfile?.profileId || !firestore) return null;
        return doc(firestore, 'profiles', userProfile.profileId);
    }, [userProfile, firestore]);
    
    const { data: profileDetails } = useDoc(profileDocRef);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: '',
            dateOfBirth: null,
            phoneNumber: '',
            position: '',
            bio: '',
        }
    });

    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (userProfile) {
            let birthDate = null;
            if (userProfile.dateOfBirth && typeof userProfile.dateOfBirth === 'string') {
                try {
                    // Tenta fazer o parse da data no formato 'yyyy-MM-dd'
                    birthDate = parse(userProfile.dateOfBirth, 'yyyy-MM-dd', new Date());
                    if (isNaN(birthDate.getTime())) {
                        // Se falhar, tenta como timestamp ISO
                        birthDate = new Date(userProfile.dateOfBirth);
                    }
                } catch {
                     birthDate = null; // Data inválida
                }
            }


            form.reset({
                name: userProfile.name || user?.displayName || '',
                dateOfBirth: birthDate && !isNaN(birthDate.getTime()) ? birthDate : null,
                phoneNumber: userProfile.phoneNumber ? formatPhoneNumber(userProfile.phoneNumber) : '',
                position: userProfile.position || '',
                bio: userProfile.bio || '',
            });
        }
    }, [userProfile, user, form]);
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };
    
    const handleLogout = async () => {
        if (auth) {
            await signOut(auth);
        }
        router.push('/login');
    };

    const onSubmit = async (data: ProfileFormValues) => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Erro de Conexão',
                description: 'Não foi possível conectar à base de dados.',
            });
            return;
        }

        setIsSaving(true);
        try {
            let newPhotoURL = user.photoURL;

            if (photo && storage) {
                const storageRef = ref(storage, `profile-pictures/${user.uid}`);
                const snapshot = await uploadBytes(storageRef, photo);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { 
                    displayName: data.name,
                    photoURL: newPhotoURL 
                });
            }

            const userDocToUpdate = doc(firestore, 'users', user.uid);
            
            const userData: any = {
                name: data.name,
                dateOfBirth: data.dateOfBirth ? format(data.dateOfBirth, 'yyyy-MM-dd') : null,
                phoneNumber: data.phoneNumber ? data.phoneNumber.replace(/\D/g, '') : null,
                position: data.position,
                bio: data.bio,
                profileCompleted: true, // Mark as completed
            };

            if (newPhotoURL) {
                 userData.photoURL = newPhotoURL;
            }
            
            await setDoc(userDocToUpdate, userData, { merge: true });

            toast({
                title: 'Perfil Atualizado!',
                description: 'As suas informações foram salvas com sucesso. Por favor, faça login novamente.',
            });
            
            await handleLogout();

        } catch (error: any) {
            console.error("Erro ao atualizar perfil:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Atualizar',
                description: 'Não foi possível atualizar o seu perfil. Tente novamente.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isUserProfileLoading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    const currentAvatarSrc = photoPreview || userProfile?.photoURL || user.photoURL;
    const profileName = profileDetails?.name || userProfile?.profileId || 'Perfil não definido';

    return (
        <AuthGuard>
            <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-4xl space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="relative">
                                        <Avatar className="h-28 w-28 border-4 border-background shadow-md">
                                            <AvatarImage src={currentAvatarSrc || undefined} />
                                            <AvatarFallback className="text-4xl">
                                                {getInitials(form.getValues('name'))}
                                            </AvatarFallback>
                                        </Avatar>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="absolute bottom-1 right-1 rounded-full h-9 w-9 bg-background/80 backdrop-blur-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Camera className="h-5 w-5" />
                                        </Button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handlePhotoChange}
                                            className="hidden"
                                            accept="image/png, image/jpeg"
                                        />
                                    </div>
                                    <div className='text-center sm:text-left'>
                                        <CardTitle className="text-3xl">{form.getValues('name') || 'Utilizador'}</CardTitle>
                                        <CardDescription className="text-base">{user.email}</CardDescription>
                                        <CardDescription className="font-semibold text-primary mt-1">{profileName}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Info size={20} /> Informações Pessoais</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nome Completo</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="dateOfBirth"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                <FormLabel>Data de Nascimento</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                        >
                                                        {field.value ? (
                                                            format(field.value, "PPP", { locale: ptBR })
                                                        ) : (
                                                            <span>Escolha uma data</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="start">
                                                    <CalendarComponent
                                                        mode="single"
                                                        captionLayout="dropdown-buttons"
                                                        fromYear={1930}
                                                        toYear={new Date().getFullYear()}
                                                        selected={field.value ?? undefined}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                          date > new Date() || date < new Date("1930-01-01")
                                                        }
                                                        initialFocus
                                                    />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                            />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Briefcase size={20} /> Informações Profissionais</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <FormField
                                            control={form.control}
                                            name="position"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Cargo / Função</FormLabel>
                                                    <FormControl><Input {...field} value={field.value ?? ''} placeholder="Ex: Professor de Matemática" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bio"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Biografia Curta</FormLabel>
                                                    <FormControl><Textarea {...field} value={field.value ?? ''} placeholder="Fale um pouco sobre si..." className="min-h-[100px]" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="lg:col-span-1 space-y-6">
                               <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Phone size={20} /> Contacto</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                         <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl><Input value={user.email || ''} disabled /></FormControl>
                                        </FormItem>
                                        <FormField
                                            control={form.control}
                                            name="phoneNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nº de Telemóvel</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            onChange={(e) => {
                                                                const formatted = formatPhoneNumber(e.target.value);
                                                                field.onChange(formatted);
                                                            }}
                                                            value={field.value ?? ''}
                                                            placeholder="(XX) XXXXXXXXX"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                             {userProfile?.profileCompleted ? (
                                <Button variant="outline" type="button" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4"/> Sair
                                </Button>
                             ) : (
                                <p className="text-sm text-muted-foreground mr-auto">Por favor, complete o seu perfil para continuar.</p>
                             )}
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar e Sair'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </main>
        </AuthGuard>
    );
}
