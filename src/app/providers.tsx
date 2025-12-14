'use client';

import { I18nProvider } from '@/contexts/i18n-provider';
import { AuthProvider } from '@/contexts/auth-provider';
import { Toaster } from "@/components/ui/toaster"
import CookieConsent from '@/components/cookie-consent';
import { ThemeProvider } from '@/components/theme-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
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
  );
}
