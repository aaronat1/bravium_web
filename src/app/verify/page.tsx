import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

export default function VerifyPage() {
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
                    <CardTitle className="text-3xl">Página de Verificación Pública</CardTitle>
                    <CardDescription>Valide la autenticidad de una credencial presentada por el titular.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        Pegue el contenido de la "Presentación Verificable" (en formato JSON) en el siguiente campo para validar su autenticidad criptográfica. El sistema comprobará la firma del emisor contra su Identificador Descentralizado (DID) público.
                    </p>
                    <form className="space-y-4 pt-4">
                        <Textarea
                            placeholder="Pegue aquí la Presentación Verificable..."
                            rows={12}
                            className="font-mono text-xs"
                        />
                        <Button type="submit" className="w-full" size="lg">Verificar Credencial</Button>
                    </form>
                    {/* Placeholder for verification result */}
                    <div className="mt-6 p-4 border rounded-md bg-muted/50 hidden">
                        <h4 className="font-semibold">Resultado de la Verificación:</h4>
                        <p className="text-green-600">✓ Verificado</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
