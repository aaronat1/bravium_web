
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { useI18n } from "@/hooks/use-i18n";

export default function PrivacyPolicyPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl mb-8">{t.landingFooter.privacy_policy}</h1>
          <div className="space-y-6 text-muted-foreground">
            <p>
              Last updated: {new Date().toLocaleDateString()}
            </p>
            <p>
              Welcome to Bravium. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.
            </p>
            <h2 className="text-2xl font-bold text-foreground pt-4">Information We Collect</h2>
            <p>
              We may collect information about you in a variety of ways. The information we may collect on the Site includes personal data that you voluntarily provide to us when you register on the site.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">Use of Your Information</h2>
            <p>
             Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to create and manage your account, email you regarding your account or order, and increase the efficiency and operation of the Site.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">Security of Your Information</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
            </p>
            
            <h2 className="text-2xl font-bold text-foreground pt-4">Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at: contact@bravium.com
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
