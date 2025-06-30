import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe, Rocket, ShieldCheck, Users, Wallet, XCircle } from 'lucide-react';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-card">
          <div className="container text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-primary">
              Plataforma de Credenciales Verificables como Servicio (VCaaS)
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-muted-foreground">
              BRAVIUM permite a instituciones emitir, gestionar y verificar credenciales digitales seguras, interoperables y controladas por el usuario.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/login">Empezar ahora</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#planes">Ver Planes</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section id="vision" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Visión Estratégica</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">De la complejidad de Blockchain a la simplicidad de la confianza digital estandarizada.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <Globe className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">Alineación con Estándares Globales</h3>
                <p className="mt-2 text-muted-foreground">Nos alineamos con los estándares W3C (DIDs y VCs), garantizando interoperabilidad futura con un ecosistema global.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <Rocket className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">Reducción Radical de la Complejidad</h3>
                <p className="mt-2 text-muted-foreground">Eliminamos la necesidad de construir consensos o minería, reduciendo drásticamente costes y tiempo de desarrollo.</p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <ShieldCheck className="h-12 w-12 text-primary mb-4"/>
                <h3 className="text-xl font-semibold">Propuesta de Valor Clara</h3>
                <p className="mt-2 text-muted-foreground">No vendemos "blockchain", vendemos confianza y verificación instantánea para combatir la falsificación de documentos.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-16 md:py-24 bg-card">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-primary">¿Cómo Funciona?</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Un flujo simple y estandarizado para la emisión y verificación de credenciales.</p>
                </div>
                <div className="relative">
                    <div className="grid md:grid-cols-3 gap-8 relative">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">1. Emisor</h3>
                            <p className="mt-2 text-muted-foreground">Tu cliente (universidad, ONG) crea y firma criptográficamente las credenciales desde el dashboard de BRAVIUM.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <Wallet className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">2. Titular</h3>
                            <p className="mt-2 text-muted-foreground">El usuario final (estudiante, donante) recibe la credencial y la almacena en una cartera digital de su elección, con control total.</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center border-4 border-card mb-4 z-10">
                                <CheckCircle className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-semibold">3. Verificador</h3>
                            <p className="mt-2 text-muted-foreground">Un tercero (empleador, auditor) valida la autenticidad de la credencial de forma instantánea usando nuestra página pública.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="planes" className="py-16 md:py-24">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Planes de Suscripción Flexibles</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Diseñados para ser accesibles y escalar con tus necesidades. Más valor que las APIs, más asequible que las soluciones empresariales.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 items-stretch">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Starter</CardTitle>
                  <CardDescription>PYMEs pequeñas, ONGs locales, departamentos universitarios.</CardDescription>
                  <p className="text-4xl font-bold pt-4">149€<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <strong>100</strong> emisiones/mes</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <strong>1.000</strong> verificaciones/mes</span></li>
                    <li className="flex items-center gap-2"><XCircle className="h-5 w-5 text-red-500" /><span>Sin soporte para ficheros adjuntos</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full">Elegir Plan</Button>
                </CardFooter>
              </Card>
              <Card className="border-primary border-2 flex flex-col relative">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">Más Popular</div>
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>PYMEs en crecimiento, ONGs medianas, facultades.</CardDescription>
                  <p className="text-4xl font-bold pt-4">249€<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <strong>500</strong> emisiones/mes</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Hasta <strong>5.000</strong> verificaciones/mes</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Soporte para ficheros adjuntos</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>1 GB de almacenamiento incluido</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button className="w-full">Elegir Plan</Button>
                </CardFooter>
              </Card>
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>Grandes empresas, universidades, consorcios de ONGs.</CardDescription>
                  <p className="text-4xl font-bold pt-4">Desde 499€<span className="text-lg font-normal text-muted-foreground">/mes</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Volúmenes personalizados</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>SLAs y soporte dedicado</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Gestión de esquemas complejos</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Soporte para ficheros adjuntos</span></li>
                    <li className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" /><span>Almacenamiento personalizado</span></li>
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" className="w-full">Contactar</Button>
                </CardFooter>
              </Card>
            </div>
             <div className="mt-12 text-left text-muted-foreground bg-card p-6 md:p-8 rounded-lg border">
                <h3 className="text-xl font-semibold text-primary mb-4 text-center">Costes Adicionales</h3>
                <ul className="space-y-4 max-w-3xl mx-auto">
                    <li><strong className="text-foreground">Tarifa de Configuración Inicial (299 € pago único):</strong> Cubre el onboarding, la personalización de marca y la configuración inicial del emisor.</li>
                    <li><strong className="text-foreground">Cargos por Uso Excedente:</strong> 0.30 € por credencial extra.</li>
                    <li><strong className="text-foreground">Almacenamiento Adicional (Planes Pro/Enterprise):</strong> 0.20 € por GB/mes que exceda el límite incluido.</li>
                    <li><strong className="text-foreground">Servicios Profesionales (Desde 250 €):</strong> Diseño de esquemas de credenciales complejos, integraciones a medida (CRM, ERP), y consultoría de confianza digital.</li>
                </ul>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
