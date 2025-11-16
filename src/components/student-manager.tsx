
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Loader2, Plus } from 'lucide-react';
import { useUser } from '@/firebase';
import StudentDataView from './student-data-view';
import { ThemeToggle } from './theme-toggle';
import ClassListGenerator from './class-list-generator';
import GradesUploaderSheet from './grades-uploader-sheet';
import FileUploaderSheet from './file-uploader-sheet';
import DataExporter from './data-exporter';
import { quotes, type Quote } from '@/lib/quotes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { UserNav } from './user-nav';
import AppFooter from './app-footer';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

export default function StudentManager() {
  const { isUserLoading } = useUser();
  const firestore = useFirestore();
  const [currentDate, setCurrentDate] = useState('');
  const [randomQuote, setRandomQuote] = useState<Quote | null>(null);

  const studentsQuery = query(collection(firestore, 'alunos'));
  const { data: students, isLoading: isDataLoading } = useCollection(studentsQuery);

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      setCurrentDate(new Intl.DateTimeFormat('pt-BR', options).format(now));
    };

    updateDate();
    const intervalId = setInterval(updateDate, 60000); 

    setRandomQuote(quotes[Math.floor(Math.random() * quotes.length)]);

    return () => clearInterval(intervalId);
  }, []);

  const onUploadSuccess = () => {
    // O hook useCollection irá atualizar automaticamente a UI.
  };

  const isPageLoading = isUserLoading || isDataLoading;
  const dataExists = students && students.length > 0;

  return (
    <>
      <main className="flex min-h-screen flex-col items-center p-4 sm:p-6 md:p-8 non-printable">
        <div className="w-full max-w-7xl mx-auto flex-1">
          <header className="mb-8 flex flex-col items-center text-center">
            <div className="w-full flex items-start justify-between">
              <div className="w-24"></div>
              <div className="flex flex-col items-center text-center">
                <Image src="/logo.png" alt="Logo" width={80} height={80} className="rounded-md" priority />
                {currentDate && <p className="text-xs text-muted-foreground mt-6">{currentDate}</p>}
                {randomQuote && (
                  <blockquote className="mt-2 text-xs italic text-muted-foreground max-w-sm relative">
                    <p className="px-4">{randomQuote.quote}</p>
                    <cite className="block text-right mt-1 not-italic">- {randomQuote.author}</cite>
                  </blockquote>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <UserNav />
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary [text-shadow:0_2px_10px_hsl(var(--primary)/0.4)] font-headline mt-6">
              Gestão de Alunos 2025
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              {dataExists ? 'Filtre e visualize os dados dos alunos ou utilize os botões de ação.' : 'Carregue o ficheiro de alunos para iniciar a gestão.'}
            </p>
          </header>

          <div className="w-full">
            {isPageLoading ? (
              <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">A verificar a base de dados...</p>
              </div>
            ) : dataExists ? (
              <StudentDataView />
            ) : (
              <div className="flex flex-col items-center justify-center h-80 rounded-lg border-2 border-dashed border-border bg-card/50">
                <p className="text-muted-foreground mb-4">Nenhum dado encontrado. Comece por carregar os dados dos alunos.</p>
                <FileUploaderSheet onUploadSuccess={onUploadSuccess} isPrimaryAction={true} />
              </div>
            )}
          </div>
        </div>
        <AppFooter />
      </main>

      {dataExists && !isPageLoading && (
        <div className="fixed bottom-6 right-6 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="rounded-full w-14 h-14 shadow-2xl flex items-center justify-center">
                <Plus className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-auto p-0 border-none bg-transparent shadow-none mb-2 flex flex-col items-end gap-3">
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 m-0 focus:bg-transparent cursor-pointer rounded-full">
                <DataExporter />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 m-0 focus:bg-transparent cursor-pointer rounded-full">
                <ClassListGenerator />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 m-0 focus:bg-transparent cursor-pointer rounded-full">
                <GradesUploaderSheet />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0 m-0 focus_bg-transparent cursor-pointer rounded-full">
                <FileUploaderSheet onUploadSuccess={onUploadSuccess} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
}
