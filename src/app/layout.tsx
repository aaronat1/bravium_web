
import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-provider';
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from '@/contexts/i18n-provider';
import CookieConsent from '@/components/cookie-consent';

export const metadata: Metadata = {
  title: 'Bravium',
  description: 'Panel de Gestión de Certificados',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <I18nProvider>
            {children}
            <CookieConsent />
          </I18nProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
