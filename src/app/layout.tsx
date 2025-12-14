
import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';


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

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning={true}>
      <body className={`${inter.variable} font-body antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
