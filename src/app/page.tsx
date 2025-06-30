import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe, Rocket, ShieldCheck, Database, Server, GitPullRequest, FileCode2, Users, Wallet, BarChart, Target, Flag, BookOpen, Scaling, FileText } from 'lucide-react';
import LandingHeader from '@/components/landing-header';
import LandingFooter from '@/components/landing-footer';
import CodeBlock from '@/components/code-block';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const didsCollectionCode = `{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:bravium:1234abcd...",
  "controller": "did:bravium:1234abcd...",
  "verificationMethod": [
    {
      "id": "#keys-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:bravium:1234abcd...",
      "publicKeyHex": "04f..."
    }
  ],
  "authentication": ["#keys-1"],
  "assertionMethod": ["#keys-1"]
}`;

const customersCollectionCode = `{
  "name": "Universidad Ejemplo",
  "email": "admin@universidadejemplo.com",
  "did": "did:bravium:1234abcd...",
  "subscriptionPlan": "pro",
  "subscriptionStatus": "active",
  "kmsKeyPath": "projects/bravium/locations/global/keyRings/main/cryptoKeys/customer-123"
}`;

const schemasCollectionCode = `{
  "owner": "customerId123",
  "name": "Título de Grado en Ingeniería",
  "schema": {
    "type": "object",
    "properties": {
      "nombreCompleto": { "type": "string" },
      "carrera": { "type": "string" },
      "fechaGraduacion": { "type": "string", "format": "date" }
    },
    "required": ["nombreCompleto", "carrera"]
  }
}`;

const firestoreRulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // La colección de DIDs es de lectura pública para que cualquiera pueda verificar,
    // pero solo el controlador del DID (el emisor autenticado) puede escribirlo.
    match /dids/{did} {
      allow read: if true;
      allow write: if request.auth.uid != null && get(/databases/$(database)/documents/customers/$(request.auth.uid)).data.did == did;
    }

    // Los datos de un cliente solo pueden ser leídos o escritos por ese mismo cliente.
    match /customers/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Los esquemas de credenciales solo pueden ser creados/leídos por su propietario.
    match /credentialSchemas/{schemaId} {
      allow read, create: if request.auth.uid == request.resource.data.owner;
      allow update, delete: if request.auth.uid == resource.data.owner;
    }
  }
}`;


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
              Construida sobre Google Firebase, BRAVIUM permite a instituciones emitir, gestionar y verificar credenciales digitales seguras, interoperables y controladas por el usuario.
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
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 hidden md:block"></div>
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
                  </ul>
                </CardContent>
                 <CardFooter>
                    <Button variant="outline" className="w-full">Contactar</Button>
                </CardFooter>
              </Card>
            </div>
             <div className="mt-12 text-center text-muted-foreground">
                <h3 className="font-semibold text-lg text-primary">Ingresos Adicionales</h3>
                <p className="mt-2">Configuración inicial, cargos por uso excedente y servicios profesionales para integraciones a medida.</p>
            </div>
          </div>
        </section>

        {/* Tech Stack Section */}
        <section id="tecnologia" className="py-16 md:py-24 bg-card">
          <div className="container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-primary">Arquitectura y Tecnología</h2>
              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Aprovechamos al máximo el ecosistema de Google Firebase para un desarrollo ágil y un producto escalable y robusto.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-2">
                    <FileCode2 className="h-8 w-8 text-primary"/>
                    <h4 className="font-semibold">Frontend</h4>
                    <p className="text-sm text-muted-foreground">Aplicación web moderna creada con Next.js/React y alojada en Firebase Hosting.</p>
                </div>
                <div className="space-y-2">
                    <Server className="h-8 w-8 text-primary"/>
                    <h4 className="font-semibold">Lógica Serverless</h4>
                    <p className="text-sm text-muted-foreground">Cloud Functions para las APIs de emisión y verificación de credenciales.</p>
                </div>
                 <div className="space-y-2">
                    <Database className="h-8 w-8 text-primary"/>
                    <h4 className="font-semibold">Base de Datos</h4>
                    <p className="text-sm text-muted-foreground">Cloud Firestore para el registro seguro de DIDs, clientes y esquemas.</p>
                </div>
                 <div className="space-y-2">
                    <ShieldCheck className="h-8 w-8 text-primary"/>
                    <h4 className="font-semibold">Gestión de Claves</h4>
                    <p className="text-sm text-muted-foreground">Google Cloud KMS para la gestión segura de las claves de firma de los emisores.</p>
                </div>
            </div>
            <div className="mt-12">
              <Card>
                <CardHeader>
                  <CardTitle>Estructura de Datos en Firestore</CardTitle>
                  <CardDescription>La base de datos es el pilar de la confianza. Aquí se define la estructura de las colecciones principales.</CardDescription>
                </CardHeader>
                <CardContent>
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><FileText className="h-5 w-5"/> Colección /dids</h4>
                    <p className="text-sm text-muted-foreground mb-2">Almacena los documentos de identidad descentralizada de los emisores. Es el "registro de confianza" público.</p>
                    <CodeBlock code={didsCollectionCode} />

                    <h4 className="font-semibold mb-2 mt-6 flex items-center gap-2"><FileText className="h-5 w-5"/> Colección /customers</h4>
                    <p className="text-sm text-muted-foreground mb-2">Almacena la información privada de tus clientes de pago (los emisores).</p>
                    <CodeBlock code={customersCollectionCode} />

                    <h4 className="font-semibold mb-2 mt-6 flex items-center gap-2"><FileText className="h-5 w-5"/> Colección /credentialSchemas</h4>
                    <p className="text-sm text-muted-foreground mb-2">Permite a los emisores definir plantillas para sus credenciales.</p>
                    <CodeBlock code={schemasCollectionCode} />
                </CardContent>
              </Card>
            </div>
            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Reglas de Seguridad de Firestore</CardTitle>
                        <CardDescription>Reglas críticas para la seguridad y los permisos del sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CodeBlock code={firestoreRulesCode} />
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section id="roadmap" className="py-16 md:py-24">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-primary">Hoja de Ruta de Desarrollo</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Un plan claro y rápido para llevar el producto al mercado.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="p-6">
                        <Flag className="h-8 w-8 text-primary mb-4"/>
                        <h3 className="text-xl font-semibold">Fase 1: MVP (1-2 meses)</h3>
                        <p className="mt-2 text-muted-foreground">Desarrollo del backend, dashboard de emisión simple y página de verificación. Objetivo: conseguir el primer cliente piloto.</p>
                    </Card>
                    <Card className="p-6">
                        <Target className="h-8 w-8 text-primary mb-4"/>
                        <h3 className="text-xl font-semibold">Fase 2: Producto Completo (2-4 meses)</h3>
                        <p className="mt-2 text-muted-foreground">Implementar gestión de plantillas, emisión masiva, sistema de facturación y landing page corporativa.</p>
                    </Card>
                     <Card className="p-6">
                        <Scaling className="h-8 w-8 text-primary mb-4"/>
                        <h3 className="text-xl font-semibold">Fase 3: Escalado y Funciones Avanzadas</h3>
                        <p className="mt-2 text-muted-foreground">Integraciones con sistemas de terceros (LMS, CRM), analítica con IA y exploración de nuevos mercados.</p>
                    </Card>
                </div>
            </div>
        </section>


      </main>
      <LandingFooter />
    </div>
  );
}
