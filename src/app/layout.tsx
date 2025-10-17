import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import GoogleAnalytics from '@/components/google-analytics';
import { FcmTokenManager } from '@/components/fcm-token-manager';

export const metadata: Metadata = {
  title: 'Gestão de Alunos',
  description: 'Upload e visualização de arquivos para gestão de alunos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        {process.env.NODE_ENV === "production" && (
          <GoogleAnalytics ga_id="GA_MEASUREMENT_ID" />
        )}
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <FcmTokenManager />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
