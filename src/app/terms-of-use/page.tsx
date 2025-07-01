
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { useI18n } from "@/hooks/use-i18n";

export default function TermsOfUsePage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl mb-8">{t.landingFooter.terms_of_use}</h1>
          <div className="space-y-6 text-muted-foreground">
            <p>
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p>
              Please read these terms of use carefully before using Our Service.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Agreement to Terms</h2>
            <p>
              By using our services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Accounts</h2>
            <p>
              When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Intellectual Property</h2>
            <p>
              The Service and its original content, features and functionality are and will remain the exclusive property of Bravium and its licensors.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: contact@bravium.com
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
