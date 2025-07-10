
"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode.react";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, CheckCircle, XCircle, QrCode } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { generateRequest, type GenerateRequestOutput } from "@/ai/flows/verify-presentation-flow";
import CodeBlock from "@/components/code-block";

type VerificationStatus = "pending" | "success" | "error" | "expired";
type PageState = "idle" | "loading" | "ready" | "verifying" | "result";


export default function VerifyPage() {
  const { t } = useI18n();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [request, setRequest] = useState<GenerateRequestOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ status: VerificationStatus, message?: string } | null>(null);
  const [sessionState, setSessionState] = useState<string | null>(null);

  const createVerificationRequest = useCallback(async () => {
    setPageState("loading");
    setError(null);
    setVerificationResult(null);
    setRequest(null);
    setSessionState(null);
    
    try {
      const response = await generateRequest();
      setRequest(response);
      setSessionState(response.state);
      setPageState("ready");
    } catch (e: any) {
      setError(e.message);
      setPageState("result");
    }
  }, []);

  useEffect(() => {
    if (pageState !== 'ready' && pageState !== 'verifying') {
      return;
    }
    if (!sessionState) return;

    setPageState("verifying");

    const sessionDocRef = doc(db, "verificationSessions", sessionState);

    const unsubscribe = onSnapshot(sessionDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === "success") {
          setVerificationResult({ status: "success", message: data.message || "Credential verified successfully!" });
          setPageState("result");
          unsubscribe();
        } else if (data.status === "error") {
          setVerificationResult({ status: "error", message: data.error || "Verification failed." });
          setPageState("result");
          unsubscribe();
        }
      }
    });
    
    const timer = setTimeout(() => {
        if (pageState === 'verifying') {
            setVerificationResult({ status: "expired", message: "The request has expired."});
            setPageState("result");
            unsubscribe();
        }
    }, 180000); // 3 minutes

    return () => {
        unsubscribe();
        clearTimeout(timer);
    };

  }, [sessionState, pageState]);


  const renderContent = () => {
    switch (pageState) {
        case "idle":
            return (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Button onClick={createVerificationRequest} size="lg">
                        <QrCode className="mr-2 h-5 w-5" />
                        Generar QR de Verificación
                    </Button>
                </div>
            );
        case "loading":
            return (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t.verifyPage.loading_request}</p>
                </div>
            );
        case "ready":
        case "verifying":
             if (request) {
                return (
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-4 bg-white rounded-lg border">
                            <QRCode value={request.requestUrl} size={256} />
                        </div>
                        <div className="text-center">
                            <p className="text-muted-foreground">{t.verifyPage.scan_qr_description}</p>
                            <div className="mt-4 flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t.verifyPage.waiting_for_presentation}</span>
                            </div>
                        </div>
                        {request.presentationDefinition && (
                            <div className="w-full mt-4">
                                <h4 className="text-lg font-semibold mb-2 text-center">Presentation Definition (JSON)</h4>
                                <CodeBlock code={JSON.stringify(request.presentationDefinition, null, 2)} />
                            </div>
                        )}
                    </div>
                );
            }
            return null; // Should not happen
        case "result":
            if (verificationResult) {
                switch (verificationResult.status) {
                    case 'success':
                        return (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                <CheckCircle className="h-16 w-16 text-green-600" />
                                <h3 className="text-2xl font-bold">{t.verifyPage.result_success_title}</h3>
                                <p className="text-muted-foreground">{verificationResult.message}</p>
                                <Button onClick={createVerificationRequest}>{t.verifyPage.new_verification_button}</Button>
                            </div>
                        );
                    case 'error':
                        return (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                <XCircle className="h-16 w-16 text-destructive" />
                                <h3 className="text-2xl font-bold">{t.verifyPage.result_error_title}</h3>
                                <p className="text-muted-foreground">{verificationResult.message}</p>
                                <Button onClick={createVerificationRequest}>{t.verifyPage.retry_button}</Button>
                            </div>
                        );
                    case 'expired':
                        return (
                            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                                <XCircle className="h-16 w-16 text-destructive" />
                                <h3 className="text-2xl font-bold">{t.verifyPage.result_expired_title}</h3>
                                <p className="text-muted-foreground">{verificationResult.message}</p>
                                <Button onClick={createVerificationRequest}>{t.verifyPage.new_verification_button}</Button>
                            </div>
                        );
                }
            } else if (error) {
                 return (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                        <XCircle className="h-12 w-12 text-destructive" />
                        <p className="text-destructive font-semibold">{t.toast_error_title}</p>
                        <p className="text-muted-foreground">{error}</p>
                        <Button onClick={createVerificationRequest}>{t.verifyPage.retry_button}</Button>
                    </div>
                )
            }
            return null;
        default:
            return null;
    }
  };

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
              <CardTitle className="text-3xl">{t.verifyPage.title}</CardTitle>
              <CardDescription>{t.verifyPage.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-8">
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
