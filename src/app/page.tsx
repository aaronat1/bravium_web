
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe, Rocket, ShieldCheck, Users, Wallet, XCircle } from 'lucide-react';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/hooks/use-i18n';

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-card">
          <div className="container text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary">
              {t.landingPage.hero.title}
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
              {t.landingPage.hero.subtitle}
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">{t.landingPage.hero.cta_start}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#planes">{t.landingPage.hero.cta_plans}</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section id="vision" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">{t.landingPage.vision.title}</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{t.landingPage.vision.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <Globe className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.vision.item1_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.vision.item1_text}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <Rocket className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.vision.item2_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.vision.item2_text}</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <ShieldCheck className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">{t.landingPage.vision.item3_title}</h3>
                <p className="mt-2 text-muted-foreground">{t.landingPage.vision.item3_text}</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 md:py-24 bg-card">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-primary">{t.landingPage.howItWorks.title}</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{t.landingPage.howItWorks.subtitle}</p>
                </div>
                <div className="relative">
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">{t.landingPage.howItWorks.step1_title}</h3>
                            <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step1_text}</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <Wallet className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">{t.landingPage.howItWorks.step2_title}</h3>
                            <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step2_text}</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">{t.landingPage.howItWorks.step3_title}</h3>
                            <p className="mt-2 text-muted-foreground">{t.landingPage.howItWorks.step3_text}</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="planes" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">{t.landingPage.pricing.title}</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{t.landingPage.pricing.subtitle}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_starter_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_starter_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">149€<span className="text-lg font-normal text-muted-foreground">{t.landingPage.pricing.price_month}</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_emissions.replace('{count}', '100')}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_verifications.replace('{count}', '1.000')}</span></li>
                    <li className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /><span>{t.landingPage.pricing.feature_attachments_no}</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full">{t.landingPage.pricing.cta_choose}</Button>
                </CardFooter>
              </Card>
              <Card className="border-primary border-2 flex flex-col relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">{t.landingPage.pricing.popular}</div>
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_pro_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_pro_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">249€<span className="text-lg font-normal text-muted-foreground">{t.landingPage.pricing.price_month}</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_emissions.replace('{count}', '500')}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_verifications.replace('{count}', '5.000')}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_attachments_yes}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_storage.replace('{gb}', '1')}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full">{t.landingPage.pricing.cta_choose}</Button>
                </CardFooter>
              </Card>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>{t.landingPage.pricing.plan_enterprise_title}</CardTitle>
                  <CardDescription>{t.landingPage.pricing.plan_enterprise_target}</CardDescription>
                  <p className="text-4xl font-bold pt-4">{t.landingPage.pricing.price_from} 499€<span className="text-lg font-normal text-muted-foreground">{t.landingPage.pricing.price_month}</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_volume}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_sla}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_schemas}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_attachments_yes}</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>{t.landingPage.pricing.feature_storage_custom}</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" className="w-full">{t.landingPage.pricing.cta_contact}</Button>
                </CardFooter>
              </Card>
            </div>
             <div className="mt-12 text-left text-muted-foreground bg-card p-6 md:p-8 rounded-lg border">
                <h3 className="text-xl font-semibold text-primary mb-4 text-center">{t.landingPage.pricing.additional_costs_title}</h3>
                <ul className="space-y-4 max-w-3xl mx-auto">
                    <li><strong className="text-foreground">{t.landingPage.pricing.cost1}</strong></li>
                    <li><strong className="text-foreground">{t.landingPage.pricing.cost2}</strong></li>
                    <li><strong className="text-foreground">{t.landingPage.pricing.cost3}</strong></li>
                    <li><strong className="text-foreground">{t.landingPage.pricing.cost4}</strong></li>
                </ul>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-16 md:py-24 bg-card">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">{t.landingPage.contact.title}</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                {t.landingPage.contact.subtitle}
              </p>
            </div>
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <form className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t.landingPage.contact.form_name}</Label>
                        <Input id="name" placeholder={t.landingPage.contact.form_name_placeholder} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t.landingPage.contact.form_email}</Label>
                        <Input id="email" type="email" placeholder={t.landingPage.contact.form_email_placeholder} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">{t.landingPage.contact.form_subject}</Label>
                      <Input id="subject" placeholder={t.landingPage.contact.form_subject_placeholder} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">{t.landingPage.contact.form_message}</Label>
                      <Textarea id="message" placeholder={t.landingPage.contact.form_message_placeholder} rows={5} />
                    </div>
                    <Button type="submit" className="w-full" size="lg">{t.landingPage.contact.form_cta}</Button>
                  </form>
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
