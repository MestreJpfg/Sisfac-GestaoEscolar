
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from "@/components/auth-guard";
import { ThemeToggle } from '@/components/theme-toggle';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AppFooter from '@/components/app-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import GenericUploader from '@/components/generic-uploader';
import { useToast } from '@/hooks/use-toast';


export default function CadastrosPage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleUploadSuccess = () => {
        toast({
            title: "Sucesso!",
            description: "Os seus dados foram enviados para processamento em segundo plano.",
        });
        // A UI não precisa de ser atualizada imediatamente, pois os dados são processados no backend.
    };

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
                                <h1 className="text-xl font-bold text-primary hidden sm:block">Cadastros via Planilha</h1>
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
                    <div className="container max-w-4xl">
                       <div className="grid gap-8 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cadastro de Funcionários</CardTitle>
                                    <CardDescription>
                                        Faça o upload de uma planilha (XLSX, CSV) com os dados dos funcionários.
                                        As colunas devem ser: <strong>nome, cargo, turno, cargaHoraria, vinculo</strong>.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <GenericUploader 
                                        collectionName="funcionarios"
                                        title="Carregar Funcionários"
                                        description="Selecione o ficheiro para carregar os dados dos funcionários."
                                        onUploadSuccess={handleUploadSuccess}
                                    />
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Cadastro de Disciplinas</CardTitle>
                                    <CardDescription>
                                        Faça o upload de uma planilha (XLSX, CSV) com os dados das disciplinas.
                                        As colunas devem ser: <strong>nome, diaPlanejamento, horaAula</strong>.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <GenericUploader 
                                        collectionName="disciplinas"
                                        title="Carregar Disciplinas"
                                        description="Selecione o ficheiro para carregar os dados das disciplinas."
                                        onUploadSuccess={handleUploadSuccess}
                                    />
                                </CardContent>
                            </Card>
                       </div>
                    </div>
                </main>
                <AppFooter />
            </div>
        </AuthGuard>
    );
}
