
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { useI18n } from "@/hooks/use-i18n";

export default function CookiesPolicyPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl mb-8">{t.landingFooter.cookies_policy}</h1>
          <div className="space-y-6 text-muted-foreground">
            <p>
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p>
              This Cookies Policy explains what cookies are and how we use them. You should read this policy to understand what cookies are, how we use them, the types of cookies we use, the information we collect using cookies and how that information is used, and how to control the cookie preferences.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">What are cookies?</h2>
            <p>
              Cookies are small text files that are used to store small pieces of information. They are stored on your device when the website is loaded on your browser. These cookies help us make the website function properly, make the website more secure, provide better user experience, and understand how the website performs and to analyze what works and where it needs improvement.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">How do we use cookies?</h2>
            <p>
              As most of the online services, our website uses first-party and third-party cookies for a number of purposes. The first-party cookies are mostly necessary for the website to function the right way, and they do not collect any of your personally identifiable data.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Contact Us</h2>
            <p>
              If you have any questions about this Cookies Policy, please contact us at: contact@bravium.com
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
