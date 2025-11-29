
'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import StudentDataView from './student-data-view';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import FileUploaderSheet from './file-uploader-sheet';

export default function StudentManager() {
  const firestore = useFirestore();
  const router = useRouter();

  const studentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'), where('profileId', '==', 'Aluno'));
  }, [firestore]);

  const { data: allStudents, isLoading: isDataLoading } = useCollection(studentsQuery);

  const onUploadSuccess = () => {
    // The useCollection hook will automatically update the UI.
  };

  const dataExists = allStudents && allStudents.length > 0;

  return (
    <>
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
                        <ThemeToggle />
                        <UserNav />
                    </nav>
                </div>
            </div>
        </header>

        <main className="flex-1 py-8">
            <div className="container">
              {isDataLoading && !dataExists ? (
                <div className="flex flex-col items-center justify-center h-96 rounded-lg border-2 border-dashed border-border bg-card/50">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">A carregar dados dos alunos...</p>
                </div>
              ) : dataExists ? (
                <StudentDataView allStudents={allStudents || []} />
              ) : (
                <div className="flex flex-col items-center justify-center h-96 rounded-lg border-2 border-dashed border-border bg-card/50">
                  <p className="text-muted-foreground mb-4">Nenhum dado encontrado. Comece por carregar os dados dos alunos.</p>
                  <FileUploaderSheet onUploadSuccess={onUploadSuccess} isPrimaryAction={true} />
                </div>
              )}
            </div>
        </main>
        <AppFooter />
      </div>
    </>
  );
}
