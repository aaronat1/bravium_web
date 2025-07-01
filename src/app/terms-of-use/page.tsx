
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { useI18n } from "@/hooks/use-i18n";
import Link from "next/link";

export default function TermsOfUsePage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl mb-8">{t.termsOfUsePage.title}</h1>
          <div className="space-y-6 text-muted-foreground">
            <p>
              {t.termsOfUsePage.lastUpdated}: {new Date().toLocaleDateString()}
            </p>
            <p>
              {t.termsOfUsePage.p1}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.termsOfUsePage.h2}</h2>
            <p>
              {t.termsOfUsePage.p2}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.termsOfUsePage.h3}</h2>
            <p>
              {t.termsOfUsePage.p3}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.termsOfUsePage.h4}</h2>
            <p>
              {t.termsOfUsePage.p4}
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">{t.termsOfUsePage.h5}</h2>
            <p>
              {t.termsOfUsePage.p5_pre_link}{' '}
              <Link href="/#contact" className="underline text-primary hover:text-primary/80">
                {t.termsOfUsePage.p5_link_text}
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
