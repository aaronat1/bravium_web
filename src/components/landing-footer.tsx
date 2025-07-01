
"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/hooks/use-i18n";

export default function LandingFooter() {
  const { t } = useI18n();

  const navItems = [
    { name: t.landingHeader.vision, href: "/#vision" },
    { name: t.landingHeader.plans, href: "/#pricing" },
    { name: t.landingHeader.verify, href: "/verify" },
    { name: t.landingHeader.help, href: "/help" },
    { name: t.landingHeader.contact, href: "/#contact" },
  ];

  const legalItems = [
    { name: t.landingFooter.privacy_policy, href: "/privacy-policy"},
    { name: t.landingFooter.terms_of_use, href: "/terms-of-use"},
    { name: t.landingFooter.cookies_policy, href: "/cookies-policy"},
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Bravium logo" width={120} height={30} />
          </Link>
          <nav className="flex gap-4 flex-wrap justify-center">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t flex flex-col-reverse md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground text-center md:text-left">
            {t.landingFooter.rights.replace('{year}', new Date().getFullYear().toString())}
          </p>
          <nav className="flex gap-4 flex-wrap justify-center md:justify-end">
            {legalItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
