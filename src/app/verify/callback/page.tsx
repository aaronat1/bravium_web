// This page handles the redirect from the wallet after a successful verification.
// For now, it just shows a simple message.

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";

export default function VerifyCallbackPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container py-12 md:py-20 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <div className="mx-auto bg-green-100 text-green-700 rounded-full p-3 w-fit mb-4">
              <CheckCircle className="h-8 w-8" />
            </div>
            <CardTitle>Verificación Exitosa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tu credencial ha sido verificada correctamente. Puedes cerrar esta ventana o volver a la página de verificación.
            </p>
            <Button asChild>
              <Link href="/verify">Volver a Verificar</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <LandingFooter />
    </div>
  );
}
