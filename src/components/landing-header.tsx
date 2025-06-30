"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useI18n } from "@/hooks/use-i18n";

export default function LandingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { t, setLocale, locale } = useI18n();

  const navItems = [
    { name: t.landingHeader.vision, href: "/#vision" },
    { name: t.landingHeader.plans, href: "/#planes" },
    { name: t.landingHeader.verify, href: "/verify" },
    { name: t.landingHeader.help, href: "/help" },
    { name: t.landingHeader.contact, href: "/#contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Bravium logo" width={120} height={30} />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Globe className="h-5 w-5" />
                <span className="sr-only">Change language</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale('es')} disabled={locale === 'es'}>
                Español
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale('en')} disabled={locale === 'en'}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/login">{t.landingHeader.access}</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t.landingHeader.openMenu}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 p-6">
                <Link href="/" className="flex items-center gap-2 mb-4" onClick={() => setIsOpen(false)}>
                    <Image src="/logo.png" alt="Bravium logo" width={120} height={30} />
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="flex items-center gap-4 mt-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <Globe className="h-5 w-5" />
                        <span className="sr-only">Change language</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setLocale('es'); setIsOpen(false); }} disabled={locale === 'es'}>
                        Español
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setLocale('en'); setIsOpen(false); }} disabled={locale === 'en'}>
                        English
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button asChild className="flex-grow">
                    <Link href="/login">{t.landingHeader.access}</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
