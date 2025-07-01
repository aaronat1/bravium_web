
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    // This check runs only on the client
    const consent = getCookie("cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const getCookie = (name: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };
  
  const handleAccept = () => {
    document.cookie = "cookie_consent=true; path=/; max-age=31536000; SameSite=Lax";
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="w-full max-w-screen-lg mx-auto shadow-2xl">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex-grow">
            {t.cookieConsent.message}{' '}
            <Link href="/cookies-policy" className="underline text-primary">
              {t.cookieConsent.learnMore}.
            </Link>
          </p>
          <div className="flex items-center gap-4">
            <Button onClick={handleAccept} size="sm">{t.cookieConsent.accept}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
