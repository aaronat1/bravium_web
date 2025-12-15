
"use client";

import Image from 'next/image';
import Link from 'next/link';

import { useI18n } from '@/hooks/use-i18n';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';
import ContactForm from '@/components/contact-form'; // Importar el nuevo componente
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import imageData from '@/lib/placeholder-images.json';

import { CheckCircle, ShieldCheck, FileWarning, Eye, GitBranchPlus } from 'lucide-react';

export default function LandingPage() {
    const { t } = useI18n();

    const standards = [
        {
            title: t.landingPage.standards.item1_title,
            text: t.landingPage.standards.item1_text,
            icon: <GitBranchPlus className="h-8 w-8" />,
        },
        {
            title: t.landingPage.standards.item2_title,
            text: t.landingPage.standards.item2_text,
            icon: <Eye className="h-8 w-8" />,
        },
        {
            title: t.landingPage.standards.item3_title,
            text: t.landingPage.standards.item3_text,
            icon: <ShieldCheck className="h-8 w-8" />,
        },
    ];

    const useCases = [
        {
            id: "universities",
            title: t.landingPage.useCases.tab1_title,
            contentTitle: t.landingPage.useCases.tab1_content_title,
            contentText: t.landingPage.useCases.tab1_content_text,
            benefits: [
                t.landingPage.useCases.tab1_benefit1,
                t.landingPage.useCases.tab1_benefit2,
                t.landingPage.useCases.tab1_benefit3,
                t.landingPage.useCases.tab1_benefit4,
            ],
            image: imageData.useCases.universities,
        },
        {
            id: "ngos",
            title: t.landingPage.useCases.tab2_title,
            contentTitle: t.landingPage.useCases.tab2_content_title,
            contentText: t.landingPage.useCases.tab2_content_text,
            benefits: [
                t.landingPage.useCases.tab2_benefit1,
                t.landingPage.useCases.tab2_benefit2,
                t.landingPage.useCases.tab2_benefit3,
                t.landingPage.useCases.tab2_benefit4,
            ],
            image: imageData.useCases.ngos,
        },
        {
            id: "companies",
            title: t.landingPage.useCases.tab3_title,
            contentTitle: t.landingPage.useCases.tab3_content_title,
            contentText: t.landingPage.useCases.tab3_content_text,
            benefits: [
                t.landingPage.useCases.tab3_benefit1,
                t.landingPage.useCases.tab3_benefit2,
                t.landingPage.useCases.tab3_benefit3,
                t.landingPage.useCases.tab3_benefit4,
            ],
            image: imageData.useCases.companies,
        },
    ];

    const faqs = [
      { id: "faq-1", q: t.landingPage.faq.q1_title, a: t.landingPage.faq.q1_text },
      { id: "faq-2", q: t.landingPage.faq.q2_title, a: t.landingPage.faq.q2_text },
      { id: "faq-3", q: t.landingPage.faq.q3_title, a: t.landingPage.faq.q3_text },
      { id: "faq-4", q: t.landingPage.faq.q4_title, a: t.landingPage.faq.q4_text },
      { id: "faq-5", q: t.landingPage.faq.q5_title, a: t.landingPage.faq.q5_text },
      { id: "faq-6", q: t.landingPage.faq.q6_title, a: t.landingPage.faq.q6_text },
    ];
    
    const getAltText = (altKey: string) => {
      const keys = altKey.split('.');
      let current: any = t;
      for (const key of keys) {
        if (current[key]) {
          current = current[key];
        } else {
          return altKey; // fallback
        }
      }
      return current;
    }


    return (
        <div className="flex flex-col min-h-screen bg-background">
            <LandingHeader />
            <main className="flex-grow">
                {/* Hero Section */}
                <section className="relative py-20 md:py-32">
                    <div className="container text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-6xl whitespace-pre-line">{t.landingPage.hero.title}</h1>
                        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-3xl mx-auto">{t.landingPage.hero.subtitle}</p>
                        <div className="mt-10 flex items-center justify-center gap-x-6">
                            <Button size="lg" asChild>
                                <Link href="/try">{t.landingPage.hero.cta_demo}</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="#pricing">{t.landingPage.hero.cta_prices}</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Standards Section */}
                <section id="vision" className="py-24 sm:py-32 bg-muted/50">
                    <div className="container">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{t.landingPage.standards.title}</h2>
                            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">{t.landingPage.standards.subtitle}</p>
                        </div>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
                            {standards.map((item) => (
                                <div key={item.title} className="flex flex-col items-center text-center">
                                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                                        {item.icon}
                                    </div>
                                    <h3 className="text-xl font-semibold">{item.title}</h3>
                                    <p className="mt-2 text-muted-foreground">{item.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
                
                {/* How It Works Section */}
                <section id="how-it-works" className="py-24 sm:py-32">
                    <div className="container text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{t.landingPage.howItWorks.title}</h2>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">1</div>
                                <p className="text-muted-foreground">{t.landingPage.howItWorks.step1_text}</p>
                            </div>
                             <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">2</div>
                                <p className="text-muted-foreground">{t.landingPage.howItWorks.step2_text}</p>
                            </div>
                             <div className="flex flex-col items-center gap-4">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold">3</div>
                                <p className="text-muted-foreground">{t.landingPage.howItWorks.step3_text}</p>
                            </div>
                        </div>
                         <div className="mt-12">
                            <Button asChild size="lg">
                                <Link href="/help">{t.landingPage.howItWorks.cta}</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Use Cases Section */}
                <section id="use-cases" className="py-24 sm:py-32 bg-muted/50">
                    <div className="container">
                        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl text-center mb-16">{t.landingPage.useCases.title}</h2>
                        <Tabs defaultValue={useCases[0].id} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                {useCases.map(uc => (
                                    <TabsTrigger key={uc.id} value={uc.id}>{uc.title}</TabsTrigger>
                                ))}
                            </TabsList>
                            {useCases.map(uc => (
                                <TabsContent key={uc.id} value={uc.id}>
                                    <Card className="overflow-hidden">
                                        <div className="grid md:grid-cols-2">
                                            <div className="p-8">
                                                <h3 className="text-2xl font-semibold">{uc.contentTitle}</h3>
                                                <p className="mt-2 text-muted-foreground">{uc.contentText}</p>
                                                <ul className="mt-6 space-y-4">
                                                    {uc.benefits.map((benefit, i) => (
                                                        <li key={i} className="flex items-start gap-3">
                                                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                                                            <span>{benefit}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-muted aspect-[4/3] md:aspect-auto">
                                                <Image
                                                    src={uc.image.src}
                                                    alt={getAltText(uc.image.alt)}
                                                    width={600}
                                                    height={450}
                                                    className="w-full h-full object-cover"
                                                    data-ai-hint={uc.image.hint}
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                </section>

                {/* Pricing Section */}
                <section id="pricing" className="py-24 sm:py-32">
                    <div className="container">
                        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl text-center">{t.landingPage.pricing.title}</h2>
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {/* Free Plan */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{t.landingPage.pricing.plan_free_title}</CardTitle>
                                    <CardDescription>{t.landingPage.pricing.plan_free_target}</CardDescription>
                                    <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_free_price}</p>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_emissions_free}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_storage_free}</span></li>
                                    </ul>
                                </CardContent>
                                <CardContent>
                                     <Button asChild className="w-full"><Link href="/register">{t.landingPage.pricing.cta_choose_plan}</Link></Button>
                                </CardContent>
                            </Card>
                             {/* Starter Plan */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{t.landingPage.pricing.plan_starter_title}</CardTitle>
                                    <CardDescription>{t.landingPage.pricing.plan_starter_target}</CardDescription>
                                    <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_starter_price}</p>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_emissions_starter}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_certify_documents}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_storage_starter}</span></li>
                                    </ul>
                                </CardContent>
                                <CardContent>
                                     <Button asChild className="w-full"><Link href="/register">{t.landingPage.pricing.cta_choose_plan}</Link></Button>
                                </CardContent>
                            </Card>
                            {/* Pro Plan */}
                            <Card className="flex flex-col border-primary border-2 relative">
                                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">{t.landingPage.pricing.popular}</div>
                                <CardHeader>
                                    <CardTitle>{t.landingPage.pricing.plan_pro_title}</CardTitle>
                                    <CardDescription>{t.landingPage.pricing.plan_pro_target}</CardDescription>
                                    <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_pro_price}</p>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_emissions_pro}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_api_access}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_storage_pro}</span></li>
                                    </ul>
                                </CardContent>
                                <CardContent>
                                    <Button asChild className="w-full"><Link href="/register">{t.landingPage.pricing.cta_choose_plan}</Link></Button>
                                </CardContent>
                            </Card>
                            {/* Enterprise Plan */}
                            <Card className="flex flex-col">
                                <CardHeader>
                                    <CardTitle>{t.landingPage.pricing.plan_enterprise_title}</CardTitle>
                                    <CardDescription>{t.landingPage.pricing.plan_enterprise_target}</CardDescription>
                                    <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.price_enterprise}</p>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <ul className="space-y-3">
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_emissions_custom}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_support_sla}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_advanced}</span></li>
                                        <li className="flex items-start gap-2"><CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.pricing.feature_storage_custom}</span></li>
                                    </ul>
                                </CardContent>
                                <CardContent>
                                     <Button asChild className="w-full" variant="outline"><Link href="#contact">{t.landingPage.pricing.cta_contact_sales}</Link></Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </section>
                
                {/* FAQ Section */}
                <section id="faq" className="py-24 sm:py-32 bg-muted/50">
                    <div className="container max-w-4xl">
                        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl text-center mb-12">{t.landingPage.faq.title}</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map(faq => (
                                <AccordionItem key={faq.id} value={faq.id}>
                                    <AccordionTrigger className="text-lg text-left">{faq.q}</AccordionTrigger>
                                    <AccordionContent className="text-base text-muted-foreground whitespace-pre-line">
                                        {faq.a}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>

                {/* Final CTA Section */}
                <section className="py-24">
                    <div className="container text-center">
                        <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{t.landingPage.finalCta.title}</h2>
                        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{t.landingPage.finalCta.subtitle}</p>
                        <div className="mt-8">
                            <Button size="lg" asChild>
                                <Link href="/try">{t.landingPage.finalCta.cta}</Link>
                            </Button>
                        </div>
                    </div>
                </section>
                
                {/* Contact Section */}
                <section id="contact" className="py-24 sm:py-32 bg-muted/50">
                    <div className="container max-w-3xl">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">{t.landingPage.contact.title}</h2>
                            <p className="mt-4 text-lg text-muted-foreground">{t.landingPage.contact.subtitle}</p>
                        </div>
                        <ContactForm />
                    </div>
                </section>
            </main>
            <LandingFooter />
        </div>
    );
}

    

    


