
'use client';

import AuthGuard from "@/components/auth-guard";
import StudentDataView from '@/components/student-data-view';
import ExStudentDataView from '@/components/ex-student-data-view';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/user-nav';
import AppFooter from '@/components/app-footer';
import { useRouter } from 'next/navigation';
import FileUploaderSheet from '@/components/file-uploader-sheet';
import Image from 'next/image';
import { ArrowLeft, Users, UserMinus } from 'lucide-react';
import { NotificationCenter } from '@/components/notification-center';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentsPage() {
  const router = useRouter();

  const onUploadSuccess = () => {
    // A view de dados irá recarregar automaticamente devido ao hook useCollection ou lógica interna.
  };

  return (
    <AuthGuard>
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Image src="/logoyuri.png" alt="Logo" width={32} height={32} className="rounded-md" />
                        <h1 className="text-lg md:text-xl font-bold text-primary hidden sm:block">Gestão de Alunos</h1>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-end space-x-4">
                    <nav className="flex items-center space-x-1">
                        <FileUploaderSheet onUploadSuccess={onUploadSuccess} />
                        <NotificationCenter />
                        <ThemeToggle />
                        <UserNav />
                    </nav>
                </div>
            </div>
            </header>

            <main className="flex-1 py-8">
                <div className="container">
                  <Tabs defaultValue="ativos" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
                      <TabsTrigger value="ativos" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Alunos Ativos
                      </TabsTrigger>
                      <TabsTrigger value="exalunos" className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Ex-Alunos / Transferidos
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="ativos" className="animate-in fade-in-50">
                      <StudentDataView />
                    </TabsContent>
                    
                    <TabsContent value="exalunos" className="animate-in fade-in-50">
                      <ExStudentDataView />
                    </TabsContent>
                  </Tabs>
                </div>
            </main>
            <AppFooter />
        </div>
    </AuthGuard>
  );
}
