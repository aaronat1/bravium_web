
"use client";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Send, ShieldCheck, FileUp, FileDown, CheckCircle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import Image from "next/image";

export default function HelpPage() {
  const { t } = useI18n();

  const protagonists = [
    {
      name: t.helpPage.protagonist_institution_name,
      role: t.helpPage.protagonist_institution_role,
      icon: <FileUp className="h-8 w-8 text-primary" />
    },
    {
      name: t.helpPage.protagonist_recipient_name,
      role: t.helpPage.protagonist_recipient_role,
      icon: <FileDown className="h-8 w-8 text-primary" />
    },
    {
      name: t.helpPage.protagonist_verifier_name,
      role: t.helpPage.protagonist_verifier_role,
      icon: <CheckCircle className="h-8 w-8 text-primary" />
    }
  ];

  const steps = [
    {
        step: t.helpPage.step1_title,
        title: t.helpPage.step1_subtitle,
        description: t.helpPage.step1_desc,
        points: [
            t.helpPage.step1_point1,
            t.helpPage.step1_point2,
            t.helpPage.step1_point3,
        ],
        image: "https://images.unsplash.com/photo-1556740758-90de374c12ad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwzfHxkYXNoYm9hcmQlMjB1aXxlbnwwfHx8fDE3NTEzMjc4Njh8MA&ixlib=rb-4.1.0&q=80&w=1080",
        alt: "Dashboard de Bravium",
        aiHint: "ui dashboard"
    },
    {
        step: t.helpPage.step2_title,
        title: t.helpPage.step2_subtitle,
        description: t.helpPage.step2_desc,
        points: [
            t.helpPage.step2_point1,
            t.helpPage.step2_point2,
            t.helpPage.step2_point3,
        ],
        image: "https://picsum.photos/seed/cert/800/600",
        alt: "Certificado digital y email",
        aiHint: "digital certificate"
    },
    {
        step: t.helpPage.step3_title,
        title: t.helpPage.step3_subtitle,
        description: t.helpPage.step3_desc,
        points: [
            t.helpPage.step3_point1,
            t.helpPage.step3_point2,
            t.helpPage.step3_point3,
        ],
        image: "https://picsum.photos/seed/verify/800/600",
        alt: "Página de verificación",
        aiHint: "verification success"
    }
  ]

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

        <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-8">{t.helpPage.protagonists_title}</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {protagonists.map((p) => (
                    <div key={p.name} className="flex flex-col items-center text-center gap-2">
                        <div className="bg-primary/10 p-4 rounded-full">
                            {p.icon}
                        </div>
                        <h3 className="font-semibold text-lg">{p.name}</h3>
                        <p className="text-sm text-muted-foreground">{p.role}</p>
                    </div>
                ))}
            </div>
        </div>

        <div className="space-y-20">
            {steps.map((item, index) => (
                <Card key={index} className="overflow-hidden shadow-lg">
                    <div className="grid md:grid-cols-2 items-center">
                        <div className={`p-8 md:p-12 ${index % 2 !== 0 ? 'md:order-last' : ''}`}>
                            <span className="text-sm font-bold uppercase text-primary tracking-wider">{item.step}</span>
                            <h3 className="text-2xl font-bold mt-2">{item.title}</h3>
                            <p className="mt-4 text-muted-foreground">{item.description}</p>
                            <ul className="mt-6 space-y-3">
                                {item.points.map((point, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                                        <span>{point}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                         <div className="bg-muted aspect-video md:aspect-auto md:h-full">
                            <Image 
                                src={item.image} 
                                alt={item.alt}
                                width={800}
                                height={600}
                                className="w-full h-full object-cover"
                                data-ai-hint={item.aiHint}
                            />
                        </div>
                    </div>
                </Card>
            ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
