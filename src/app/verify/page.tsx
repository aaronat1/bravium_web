
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

export default function VerifyPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
            <Card className="shadow-lg">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                      <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-3xl">{t.verifyPage.title}</CardTitle>
                    <CardDescription>{t.verifyPage.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        {t.verifyPage.description}
                    </p>
                    <form className="space-y-4 pt-4">
                        <Textarea
                            placeholder={t.verifyPage.placeholder}
                            rows={12}
                            className="font-mono text-xs"
                        />
                        <div className="flex justify-center">
                          <Button type="submit" size="lg">{t.verifyPage.cta}</Button>
                        </div>
                    </form>
                    {/* Placeholder for verification result */}
                    <div className="mt-6 p-4 border rounded-md bg-muted/50 hidden">
                        <h4 className="font-semibold">{t.verifyPage.result_title}</h4>
                        <p className="text-green-600">{t.verifyPage.result_success}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
