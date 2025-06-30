
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Wallet, Users, BookOpen } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

const WalletIcon = ({ iconName }: { iconName: string }) => {
    if (iconName === 'apple') {
        return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>;
    }
    if (iconName === 'google') {
        return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary"><path d="M15.5 16.5c-2-1.5-2.5-4-1-6"/><path d="M20.5 12.5c-2-2-5-2-7 0"/><path d="M12 2a10 10 0 0 0-10 10c0 5 2.4 8.5 6.4 9.5"/><path d="M18 20c2 0 4-2 4-5.5a4.5 4.5 0 0 0-4-4.5c-2.5 0-4 2-4 4a4 4 0 0 0 4 5Z"/></svg>;
    }
    if (iconName === 'microsoft') {
        return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary"><path d="M11.5,11.5H2V2h9.5V11.5z M22,11.5h-9.5V2H22V11.5z M11.5,22H2v-9.5h9.5V22z M22,22h-9.5v-9.5H22V22z"/></svg>;
    }
    return <BookOpen className="h-8 w-8 text-primary"/>
}


export default function HelpPage() {
  const { t } = useI18n();
  
  const wallets = [
    {
      name: t.helpPage.wallet_apple_name,
      platform: t.helpPage.wallet_apple_platform,
      description: t.helpPage.wallet_apple_desc,
      icon: "apple"
    },
    {
      name: t.helpPage.wallet_google_name,
      platform: t.helpPage.wallet_google_platform,
      description: t.helpPage.wallet_google_desc,
      icon: "google"
    },
    {
      name: t.helpPage.wallet_microsoft_name,
      platform: t.helpPage.wallet_microsoft_platform,
      description: t.helpPage.wallet_microsoft_desc,
      icon: "microsoft"
    },
    {
      name: t.helpPage.wallet_learner_name,
      platform: t.helpPage.wallet_learner_platform,
      description: t.helpPage.wallet_learner_desc,
      icon: "learner"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20">
        <div className="text-center mb-16">
            <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">{t.helpPage.title}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                {t.helpPage.subtitle}
            </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {wallets.map((wallet) => (
                <Card key={wallet.name} className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader className="items-center">
                        <div className="bg-primary/10 rounded-full p-3">
                           <WalletIcon iconName={wallet.icon} />
                        </div>
                        <CardTitle>{wallet.name}</CardTitle>
                        <CardDescription>{wallet.platform}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">{wallet.description}</p>
                    </CardContent>
                </Card>
            ))}
        </div>

        <div className="mt-20 text-center bg-card p-8 md:p-12 rounded-lg border">
            <h2 className="text-3xl font-bold text-primary">{t.helpPage.your_control_title}</h2>
            <div className="grid md:grid-cols-3 gap-8 mt-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">{t.helpPage.step1_title}</h3>
                    <p className="text-sm text-muted-foreground">{t.helpPage.step1_desc}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <Wallet className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">{t.helpPage.step2_title}</h3>
                    <p className="text-sm text-muted-foreground">{t.helpPage.step2_desc}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 p-4 rounded-full">
                        <CheckCircle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">{t.helpPage.step3_title}</h3>
                    <p className="text-sm text-muted-foreground">{t.helpPage.step3_desc}</p>
                </div>
            </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
