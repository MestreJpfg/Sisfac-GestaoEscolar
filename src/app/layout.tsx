
'use client'; // Adicionado para permitir o uso de hooks e providers no cliente

import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import GoogleAnalytics from '@/components/google-analytics';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Importado

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});

// A metadata não pode ser exportada de um client component,
// mas manteremos a estrutura para referência futura ou migração.
// export const metadata: Metadata = {
//   title: 'Gestão de Alunos',
//   description: 'Upload e visualização de arquivos para gestão de alunos',
//   manifest: '/manifest.webmanifest'
// };

// Criar uma instância do QueryClient
const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <title>Gestão de Alunos</title>
        <meta name="description" content="Upload e visualização de arquivos para gestão de alunos" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#1e88e5" />
        {process.env.NODE_ENV === "production" && (
          <GoogleAnalytics ga_id="GA_MEASUREMENT_ID" />
        )}
      </head>
      <body className="font-body antialiased">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <FirebaseClientProvider>
              {children}
            </FirebaseClientProvider>
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
