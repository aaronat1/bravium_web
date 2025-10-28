
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Loader2, Rocket, ShieldCheck, Wallet, FilePlus2, Send, Globe, Layers, X, FileSignature } from 'lucide-react';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/use-i18n';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addContactMessage } from '@/lib/firebase/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function LandingPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, { message: t.landingPage.contact.form_validation_name }),
    email: z.string().email({ message: t.landingPage.contact.form_validation_email }),
    subject: z.string().min(1, { message: t.landingPage.contact.form_validation_subject }),
    message: z.string().min(10, { message: t.landingPage.contact.form_validation_message }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const { success } = await addContactMessage(values);
    setLoading(false);

    if (success) {
      toast({
        title: t.landingPage.contact.toast_success_title,
        description: t.landingPage.contact.toast_success_desc,
      });
      form.reset();
    } else {
      toast({
        variant: "destructive",
        title: t.landingPage.contact.toast_error_title,
        description: t.landingPage.contact.toast_error_desc,
      });
    }
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-background relative">
            <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom mask-image-hero"></div>
            <div className="container text-center relative">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                {t.landingPage.hero.title}
                </h1>
                <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                {t.landingPage.hero.subtitle}
                </p>
                <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg">
                    <Link href="/login">{t.landingPage.hero.cta_demo}</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="#pricing">{t.landingPage.hero.cta_prices}</Link>
                </Button>
                </div>
            </div>
        </section>

        {/* Standards Section */}
        <section id="vision" className="py-16 md:py-24 bg-muted">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.standards.title}</h2>
              <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t.landingPage.standards.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <Globe className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.standards.item1_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.standards.item1_text}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <Wallet className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.standards.item2_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.standards.item2_text}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <Layers className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.standards.item3_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.standards.item3_text}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="py-16 md:py-24 bg-background">
            <div className="container">
                <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.problem.title}</h2>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t.landingPage.problem.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                      <svg width="48" height="48" viewBox="0 0 24 24" className="text-primary mb-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                      <h3 className="text-xl font-semibold">{t.landingPage.problem.item1_title}</h3>
                      <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item1_text}</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                      <svg width="48" height="48" viewBox="0 0 24 24" className="text-primary mb-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
                      <h3 className="text-xl font-semibold">{t.landingPage.problem.item2_title}</h3>
                      <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item2_text}</p>
                  </div>
                  <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                      <Wallet className="h-12 w-12 text-primary mb-4"/>
                      <h3 className="text-xl font-semibold">{t.landingPage.problem.item3_title}</h3>
                      <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item3_text}</p>
                  </div>
                </div>
            </div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="py-16 md:py-24 bg-muted">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.solution.title}</h2>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t.landingPage.solution.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center p-6">
                    <ShieldCheck className="h-12 w-12 text-primary mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item1_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item1_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6">
                    <Rocket className="h-12 w-12 text-primary mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item2_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item2_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6">
                    <svg width="48" height="48" viewBox="0 0 24 24" className="text-primary mb-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M16 12H8m4-4-4 4 4 4"/></svg>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item3_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item3_text}</p>
                </div>
                </div>
            </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 md:py-24 bg-background">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.howItWorks.title}</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="flex flex-col items-center text-center">
                        <FilePlus2 className="h-12 w-12 text-primary mb-4"/>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step1_text}</p>
                    </div>
                     <div className="flex flex-col items-center text-center">
                        <Send className="h-12 w-12 text-primary mb-4"/>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step2_text}</p>
                    </div>
                     <div className="flex flex-col items-center text-center">
                        <Wallet className="h-12 w-12 text-primary mb-4"/>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step3_text}</p>
                    </div>
                </div>
                 <div className="mt-12 text-center">
                    <Button asChild>
                        <Link href="/help">{t.landingPage.howItWorks.cta}</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-16 md:py-24 bg-muted">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.useCases.title}</h2>
            </div>
            <Tabs defaultValue="universities" className="w-full">
              <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 max-w-2xl mx-auto">
                <TabsTrigger value="universities">{t.landingPage.useCases.tab1_title}</TabsTrigger>
                <TabsTrigger value="ngos">{t.landingPage.useCases.tab2_title}</TabsTrigger>
                <TabsTrigger value="companies">{t.landingPage.useCases.tab3_title}</TabsTrigger>
              </TabsList>
              <TabsContent value="universities" className="mt-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{t.landingPage.useCases.tab1_content_title}</h3>
                    <p className="text-muted-foreground mb-6">{t.landingPage.useCases.tab1_content_text}</p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab1_benefit1}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab1_benefit2}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab1_benefit3}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab1_benefit4}</span></li>
                    </ul>
                  </div>
                  <div className="aspect-[3/2] overflow-hidden rounded-lg shadow-lg">
                    <Image src="https://images.unsplash.com/photo-1653945475312-03bb03fd1303?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNnx8QSVDMyVCMWFkZSUyMGltYWdlbiUyMHJlbGFjaW9uYWRhJTIwY29uJTIwZXN0dWRpYW50ZXMlMkMlMjBleCVDMyVBMW1lbmVzJTIweSUyMHVuaXZlcnNpZGFkfGVufDB8fHx8MTc1MTMxNjE5Nnww&ixlib=rb-4.1.0&q=80&w=1080" alt={t.landingPage.useCases.tab1_alt} width={600} height={400} className="w-full h-full object-cover" data-ai-hint="university students" />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="ngos" className="mt-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{t.landingPage.useCases.tab2_content_title}</h3>
                    <p className="text-muted-foreground mb-6">{t.landingPage.useCases.tab2_content_text}</p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab2_benefit1}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab2_benefit2}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab2_benefit3}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab2_benefit4}</span></li>
                    </ul>
                  </div>
                   <div className="aspect-[3/2] overflow-hidden rounded-lg shadow-lg">
                    <Image src="https://images.unsplash.com/photo-1589190887320-d1b6af2bdac3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxBeXVkYSUyMGh1bWFuaXRhcmlhfGVufDB8fHx8MTc1MTMxNjM0NXww&ixlib=rb-4.1.0&q=80&w=1080" alt={t.landingPage.useCases.tab2_alt} width={600} height={400} className="w-full h-full object-cover" data-ai-hint="community volunteers" />
                   </div>
                </div>
              </TabsContent>
              <TabsContent value="companies" className="mt-8">
                 <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{t.landingPage.useCases.tab3_content_title}</h3>
                    <p className="text-muted-foreground mb-6">{t.landingPage.useCases.tab3_content_text}</p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab3_benefit1}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab3_benefit2}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab3_benefit3}</span></li>
                        <li className="flex items-start gap-3"><Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" /><span>{t.landingPage.useCases.tab3_benefit4}</span></li>
                    </ul>
                  </div>
                   <div className="aspect-[3/2] overflow-hidden rounded-lg shadow-lg">
                    <Image src="https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxQeW1lfGVufDB8fHx8MTc1MTMxNjUwMHww&ixlib=rb-4.1.0&q=80&w=1080" alt={t.landingPage.useCases.tab3_alt} width={600} height={400} className="w-full h-full object-cover" data-ai-hint="corporate meeting" />
                   </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-background">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.pricing.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
               {/* Free Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_free_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_free_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_free_price}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_emissions_free}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_certify_documents}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_storage_free}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_api_access}</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login">{t.landingPage.pricing.cta_choose_plan}</Link>
                    </Button>
                </CardFooter>
              </Card>

              {/* Starter Plan */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_starter_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_starter_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_starter_price}<span className="text-lg font-normal text-muted-foreground">/{locale === 'es' ? 'mes' : 'month'}</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_emissions_starter}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_certify_documents}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_storage_starter}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_api_access}</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="#contact">{t.landingPage.pricing.cta_choose_plan}</Link>
                    </Button>
                </CardFooter>
              </Card>

              {/* Pro Plan */}
              <Card className="border-primary border-2 flex flex-col relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">{t.landingPage.pricing.popular}</div>
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_pro_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_pro_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.plan_pro_price}<span className="text-lg font-normal text-muted-foreground">/{locale === 'es' ? 'mes' : 'month'}</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_emissions_pro}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_certify_documents}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_storage_pro}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_api_access}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button asChild className="w-full">
                       <Link href="#contact">{t.landingPage.pricing.cta_choose_plan}</Link>
                    </Button>
                </CardFooter>
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
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_emissions_custom}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_verifications_unlimited}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_support_sla}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_advanced}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-primary flex-shrink-0" /><span>{t.landingPage.pricing.feature_storage_custom}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="#contact">{t.landingPage.pricing.cta_contact_sales}</Link>
                    </Button>
                </CardFooter>
              </Card>
            </div>
            <div className="mt-16 text-center">
              <h3 className="text-2xl font-bold text-foreground">{t.landingPage.pricing.add_ons_title}</h3>
              <div className="mt-8 max-w-4xl mx-auto grid md:grid-cols-2 gap-8 text-left">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">{t.landingPage.pricing.add_on_extra_emission}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground text-center">{t.landingPage.pricing.add_on_extra_storage}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24 bg-muted">
            <div className="container max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.faq.title}</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q1_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q1_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q2_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q2_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q3_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q3_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q4_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q4_text}</AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="item-5">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q5_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q5_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-6">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q6_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">{t.landingPage.faq.q6_text}</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {t.landingPage.finalCta.title}
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              {t.landingPage.finalCta.subtitle}
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="#contact">{t.landingPage.finalCta.cta}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 md:py-24 bg-muted">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.contact.title}</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                {t.landingPage.contact.subtitle}
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.landingPage.contact.form_name}</FormLabel>
                              <FormControl>
                                <Input placeholder={t.landingPage.contact.form_name_placeholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.landingPage.contact.form_email}</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder={t.landingPage.contact.form_email_placeholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                          control={form.control}
                          name="subject"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.landingPage.contact.form_subject}</FormLabel>
                              <FormControl>
                                <Input placeholder={t.landingPage.contact.form_subject_placeholder} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t.landingPage.contact.form_message}</FormLabel>
                              <FormControl>
                                <Textarea placeholder={t.landingPage.contact.form_message_placeholder} rows={5} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      <div className="flex justify-center">
                        <Button type="submit" size="lg" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {t.landingPage.contact.form_cta}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
}

    