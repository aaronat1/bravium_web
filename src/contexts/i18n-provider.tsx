
"use client";

import { createContext, useState, useMemo, type ReactNode } from 'react';
import { es } from '@/locales/es';
import { en } from '@/locales/en';

type Locale = 'es' | 'en';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: typeof es; 
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations = { es, en };

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('es');

  const t = useMemo(() => translations[locale], [locale]);

  const value = {
    locale,
    setLocale,
    t,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
