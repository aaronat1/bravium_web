
import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-provider';
import { Toaster } from "@/components/ui/toaster"
import { I18nProvider } from '@/contexts/i18n-provider';
import CookieConsent from '@/components/cookie-consent';
import { ThemeProvider } from '@/components/theme-provider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bravium.es';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Bravium: Credenciales Digitales Verificables, Inmutables y Seguras',
    template: '%s | Bravium',
  },
  description: 'Bravium es la plataforma líder para emitir credenciales digitales y certificados con seguridad criptográfica. Elimina el fraude y automatiza la verificación.',
  keywords: ['credenciales verificables', 'verifiable credentials', 'blockchain', 'identidad digital', 'certificados digitales', 'títulos universitarios', 'seguridad criptográfica', 'W3C DID', 'JWS'],
  authors: [{ name: 'Bravium', url: SITE_URL }],
  creator: 'Bravium',
  publisher: 'Bravium',
  openGraph: {
    title: 'Bravium: Credenciales Digitales Verificables',
    description: 'Emite títulos y certificados con seguridad criptográfica. Elimina el fraude y automatiza la verificación.',
    url: SITE_URL,
    siteName: 'Bravium',
    images: [
      {
        url: '/og-image.png', // Se recomienda crear este archivo en /public
        width: 1200,
        height: 630,
        alt: 'Logo de Bravium sobre un fondo tecnológico',
      },
    ],
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bravium: Credenciales Digitales Verificables',
    description: 'La plataforma líder para emitir certificados y títulos con seguridad criptográfica.',
    // creator: '@TuUsuarioDeTwitter', // Descomentar si tienes un usuario de Twitter
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'es': '/es',
      'en': '/en',
    },
  },
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <I18nProvider>
              {children}
              <CookieConsent />
            </I18nProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
