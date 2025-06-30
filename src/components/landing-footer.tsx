
"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export default function LandingFooter() {
  const { t } = useI18n();

  const navItems = [
    { name: t.landingHeader.vision, href: "/#vision" },
    { name: t.landingHeader.plans, href: "/#planes" },
    { name: t.landingHeader.verify, href: "/verify" },
    { name: t.landingHeader.help, href: "/help" },
    { name: t.landingHeader.contact, href: "/#contact" },
  ];

  return (
    <footer className="border-t bg-card">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary">Bravium</span>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">{t.landingFooter.rights.replace('{year}', new Date().getFullYear().toString())}</p>
        </div>
      </div>
    </footer>
  );
}
