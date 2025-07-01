"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import { Loader2, Globe } from "lucide-react";
import { UserNav } from "@/components/user-nav";
import { useI18n } from "@/hooks/use-i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { setLocale, locale } = useI18n();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <header className="flex h-20 items-center justify-end px-6 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-4">
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
              <UserNav />
            </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
