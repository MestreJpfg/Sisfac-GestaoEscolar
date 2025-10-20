import type {Metadata} from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import GoogleAnalytics from '@/components/google-analytics';
import { FcmTokenManager } from '@/components/fcm-token-manager';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-poppins',
});


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
    <html lang="en" className={`dark ${inter.variable} ${poppins.variable}`}>
      <head>
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
