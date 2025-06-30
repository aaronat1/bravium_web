
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, CheckCircle, FileClock, FileX2, KeyRound, Loader2, Rocket, ShieldCheck, Wallet } from 'lucide-react';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/use-i18n';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addContactMessage } from '@/lib/firebase/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';


export default function LandingPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

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
        <section className="py-20 md:py-32 bg-card relative">
            <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom mask-image-hero"></div>
            <div className="container text-center relative">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
                {t.landingPage.hero.title}
                </h1>
                <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
                {t.landingPage.hero.subtitle}
                </p>
                <div className="mt-8 flex justify-center gap-4">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <Link href="#contact">{t.landingPage.hero.cta_demo}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-accent text-accent hover:bg-accent/10">
                    <Link href="#pricing">{t.landingPage.hero.cta_prices}</Link>
                </Button>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{t.landingPage.hero.trust_text}</p>
            </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-8 bg-background">
            <div className="container text-center">
                <p className="text-sm font-semibold text-muted-foreground tracking-wider uppercase">{t.landingPage.socialProof.title}</p>
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
                    <p className="font-bold text-lg">W3C Member</p>
                    <p className="font-bold text-lg">OpenWallet</p>
                    <p className="font-bold text-lg">Alastria</p>
                    <p className="font-bold text-lg">Hyperledger</p>
                </div>
            </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="py-16 md:py-24">
            <div className="container">
                <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.problem.title}</h2>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t.landingPage.problem.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                    <FileX2 className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.problem.item1_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item1_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                    <FileClock className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.problem.item2_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item2_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
                    <Wallet className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.problem.item3_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.problem.item3_text}</p>
                </div>
                </div>
            </div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="py-16 md:py-24 bg-card">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.solution.title}</h2>
                    <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t.landingPage.solution.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center text-center p-6">
                    <ShieldCheck className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item1_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item1_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6">
                    <Rocket className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item2_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item2_text}</p>
                </div>
                <div className="flex flex-col items-center text-center p-6">
                    <KeyRound className="h-12 w-12 text-accent mb-4"/>
                    <h3 className="text-xl font-semibold">{t.landingPage.solution.item3_title}</h3>
                    <p className="mt-2 text-muted-foreground">{t.landingPage.solution.item3_text}</p>
                </div>
                </div>
            </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 md:py-24">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.howItWorks.title}</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="text-center">
                        <div className="text-5xl font-bold text-accent">1</div>
                        <h3 className="mt-4 text-xl font-semibold">{t.landingPage.howItWorks.step1_title}</h3>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step1_text}</p>
                    </div>
                     <div className="text-center">
                        <div className="text-5xl font-bold text-accent">2</div>
                        <h3 className="mt-4 text-xl font-semibold">{t.landingPage.howItWorks.step2_title}</h3>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step2_text}</p>
                    </div>
                     <div className="text-center">
                        <div className="text-5xl font-bold text-accent">3</div>
                        <h3 className="mt-4 text-xl font-semibold">{t.landingPage.howItWorks.step3_title}</h3>
                        <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step3_text}</p>
                    </div>
                </div>
                 <div className="mt-12 text-center">
                    <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Link href="/help">{t.landingPage.howItWorks.cta}</Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Use Cases Section */}
        <section id="use-cases" className="py-16 md:py-24 bg-card">
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
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab1_benefit1}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab1_benefit2}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab1_benefit3}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab1_benefit4}</span></li>
                    </ul>
                  </div>
                  <Image src="https://placehold.co/600x400.png" alt="University use case" width={600} height={400} className="rounded-lg shadow-lg" data-ai-hint="student graduation" />
                </div>
              </TabsContent>
              <TabsContent value="ngos" className="mt-8">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{t.landingPage.useCases.tab2_content_title}</h3>
                    <p className="text-muted-foreground mb-6">{t.landingPage.useCases.tab2_content_text}</p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab2_benefit1}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab2_benefit2}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab2_benefit3}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab2_benefit4}</span></li>
                    </ul>
                  </div>
                   <Image src="https://placehold.co/600x400.png" alt="NGO use case" width={600} height={400} className="rounded-lg shadow-lg" data-ai-hint="charity donation" />
                </div>
              </TabsContent>
              <TabsContent value="companies" className="mt-8">
                 <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{t.landingPage.useCases.tab3_content_title}</h3>
                    <p className="text-muted-foreground mb-6">{t.landingPage.useCases.tab3_content_text}</p>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab3_benefit1}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab3_benefit2}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab3_benefit3}</span></li>
                        <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-accent mt-1" /><span>{t.landingPage.useCases.tab3_benefit4}</span></li>
                    </ul>
                  </div>
                   <Image src="https://placehold.co/600x400.png" alt="Company use case" width={600} height={400} className="rounded-lg shadow-lg" data-ai-hint="business team" />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.pricing.title}</h2>
              <div className="mt-4 flex items-center justify-center gap-4">
                <Label htmlFor="pricing-toggle">{t.landingPage.pricing.monthly}</Label>
                <Switch id="pricing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
                <Label htmlFor="pricing-toggle">
                  {t.landingPage.pricing.annual}
                  <span className="ml-2 bg-accent/20 text-accent font-semibold px-2 py-1 rounded-full text-xs">{t.landingPage.pricing.save}</span>
                </Label>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_starter_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_starter_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{isAnnual ? '119€' : '149€'}<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_emissions_starter}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_verifications_starter}</span></li>
                     <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_templates}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_support_email}</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                        <Link href="#contact">{t.landingPage.pricing.cta_choose_starter}</Link>
                    </Button>
                </CardFooter>
              </Card>
              <Card className="border-accent border-2 flex flex-col relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-semibold">{t.landingPage.pricing.popular}</div>
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_pro_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_pro_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{isAnnual ? '199€' : '249€'}<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_emissions_pro}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_verifications_pro}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_ai_assistant}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_attachments}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_support_priority}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                       <Link href="#contact">{t.landingPage.pricing.cta_choose_pro}</Link>
                    </Button>
                </CardFooter>
              </Card>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_enterprise_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_enterprise_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.price_custom}</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_volume}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_api}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_sla}</span></li>
                    <li className="flex items-center gap-2"><Check className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_support_dedicated}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                        <Link href="#contact">{t.landingPage.pricing.cta_contact_sales}</Link>
                    </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-16 md:py-24 bg-card">
            <div className="container max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">{t.landingPage.faq.title}</h2>
                </div>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q1_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{t.landingPage.faq.q1_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q2_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{t.landingPage.faq.q2_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q3_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{t.landingPage.faq.q3_text}</AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                        <AccordionTrigger className="text-lg text-left">{t.landingPage.faq.q4_title}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">{t.landingPage.faq.q4_text}</AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-32">
          <div className="container text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              {t.landingPage.finalCta.title}
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              {t.landingPage.finalCta.subtitle}
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="#contact">{t.landingPage.finalCta.cta}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 md:py-24 bg-card">
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
                      <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" size="lg" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t.landingPage.contact.form_cta}
                      </Button>
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
