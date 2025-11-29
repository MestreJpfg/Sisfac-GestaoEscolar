
'use client';

import Image from 'next/image';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import StudentDataView from './student-data-view';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, getCountFromServer } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import FileUploaderSheet from './file-uploader-sheet';
import { useEffect, useState } from 'react';

export default function StudentManager() {
  const firestore = useFirestore();
  const router = useRouter();
  const [studentCount, setStudentCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(true);

  const onUploadSuccess = () => {
    // The useCollection hook in StudentDataView will automatically update.
  };

  useEffect(() => {
    const fetchCount = async () => {
      if (!firestore) return;
      setIsLoadingCount(true);
      try {
        const studentsColl = collection(firestore, 'alunos');
        const snapshot = await getCountFromServer(query(studentsColl));
        setStudentCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching student count:", error);
      } finally {
        setIsLoadingCount(false);
      }
    };
    fetchCount();
  }, [firestore]);
  
  const dataExists = studentCount > 0;

  return (
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
              {isLoadingCount ? (
                 <div className="flex flex-col items-center justify-center h-96 rounded-lg border-2 border-dashed border-border bg-card/50">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-muted-foreground">A verificar base de dados...</p>
                </div>
              ) : dataExists ? (
                <StudentDataView />
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
  );
}
