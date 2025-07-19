
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";

export default function VerifyCallbackPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full p-3 w-fit mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle>{t.verifyPage.result_success_title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t.verifyPage.result_success_message}
            </p>
            <Button asChild>
              <Link href="/verify">{t.verifyPage.new_verification_button}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <LandingFooter />
    </div>
  );
}
