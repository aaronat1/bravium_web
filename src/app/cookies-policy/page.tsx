
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { useI18n } from "@/hooks/use-i18n";
import Link from "next/link";

export default function CookiesPolicyPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl mb-8">{t.cookiesPolicyPage.title}</h1>
          <div className="space-y-6 text-muted-foreground">
            <p>
              {t.cookiesPolicyPage.lastUpdated}: {new Date().toLocaleDateString()}
            </p>
            <p>
              {t.cookiesPolicyPage.p1}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.cookiesPolicyPage.h2}</h2>
            <p>
              {t.cookiesPolicyPage.p2}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.cookiesPolicyPage.h3}</h2>
            <p>
              {t.cookiesPolicyPage.p3}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.cookiesPolicyPage.h4}</h2>
            <p>
              {t.cookiesPolicyPage.p4_pre_link}{' '}
              <Link href="/#contact" className="underline text-primary hover:text-primary/80">
                {t.cookiesPolicyPage.p4_link_text}
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
