
"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode.react";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, CheckCircle, XCircle } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { generateVerificationRequest, type GenerateVerificationRequestOutput } from "@/actions/verificationActions";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

type VerificationStatus = "pending" | "success" | "error" | "expired";

export default function VerifyPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [request, setRequest] = useState<GenerateVerificationRequestOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ status: VerificationStatus, message?: string } | null>(null);

  const createVerificationRequest = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVerificationResult(null);
    setRequest(null);
    try {
      const result = await generateVerificationRequest();
      if (result.success && result.data) {
        setRequest(result.data);
      } else {
        setError(result.message || "Failed to generate request.");
        toast({ variant: "destructive", title: t.toast_error_title, description: result.message });
      }
    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: t.toast_error_title, description: e.message });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    createVerificationRequest();
  }, [createVerificationRequest]);

  useEffect(() => {
    if (!request?.state) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "verificationSessions", request.state), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.status === "success") {
          setVerificationResult({ status: "success", message: "Credential verified successfully!" });
          unsubscribe();
        } else if (data.status === "error") {
          setVerificationResult({ status: "error", message: data.error || "Verification failed." });
          unsubscribe();
        }
      }
    });

    const timer = setTimeout(() => {
        if (!verificationResult) {
            setVerificationResult({ status: "expired", message: "The request has expired."});
            unsubscribe();
        }
    }, 300000); // 5 minutes

    return () => {
        unsubscribe();
        clearTimeout(timer);
    };

  }, [request, verificationResult]);


  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t.verifyPage.loading_request}</p>
        </div>
      );
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="text-destructive font-semibold">{t.toast_error_title}</p>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={createVerificationRequest}>{t.verifyPage.retry_button}</Button>
            </div>
        )
    }

    if (verificationResult) {
         switch (verificationResult.status) {
            case 'success':
                return (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                        <CheckCircle className="h-16 w-16 text-green-600" />
                        <h3 className="text-2xl font-bold">{t.verifyPage.result_success_title}</h3>
                        <p className="text-muted-foreground">{t.verifyPage.result_success_message}</p>
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
            default:
                return null;
        }
    }

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
            </div>
        )
    }

    return null;
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
