
"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import QRCode from "qrcode.react";
import { httpsCallable, type HttpsCallableError } from 'firebase/functions';
import jsPDF from "jspdf";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { db, functions } from "@/lib/firebase/config";
import { saveIssuedCredential } from "@/actions/issuanceActions";
import type { CredentialTemplate } from "@/app/(app)/templates/page";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, Copy, Check, AlertTriangle, Download, Share2, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


// For the demo, we use a predefined customer (the admin/verifier) to issue the credential.
const DEMO_CUSTOMER_ID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

const formSchema = z.object({
    email: z.string().email({ message: "Por favor, introduce un email válido." }),
    templateId: z.string().min(1, { message: "Debes seleccionar una plantilla." }),
});

type FormData = z.infer<typeof formSchema>;

export default function TryNowPage() {
    const { t } = useI18n();
    const router = useRouter();
    const { toast } = useToast();
    
    const [publicTemplates, setPublicTemplates] = useState<CredentialTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<CredentialTemplate | null>(null);

    const [isIssuing, setIsIssuing] = useState(false);
    const [issuedCredential, setIssuedCredential] = useState<{jws: string, id: string} | null>(null);
    const [hasCopied, setHasCopied] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const isShareSupported = typeof navigator !== 'undefined' && !!navigator.share;
    

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            templateId: "",
        }
    });
    
    const { handleSubmit, control, watch } = form;
    const watchedTemplateId = watch("templateId");

    useEffect(() => {
        setLoadingTemplates(true);
        const templatesCollectionRef = collection(db, "credentialSchemas");
        const q = query(templatesCollectionRef, where("public", "==", true));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CredentialTemplate));
            setPublicTemplates(fetchedTemplates);
            setLoadingTemplates(false);
        }, (error) => {
            console.error("Error fetching public templates:", error);
            toast({ variant: "destructive", title: t.toast_error_title, description: "Failed to load demo templates." });
            setLoadingTemplates(false);
        });
        
        return () => unsubscribe();
    }, [t, toast]);

     useEffect(() => {
        const template = publicTemplates.find(t => t.id === watchedTemplateId) || null;
        setSelectedTemplate(template);
    }, [watchedTemplateId, publicTemplates]);


    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!selectedTemplate) {
            toast({ variant: "destructive", title: "Error", description: "No template selected." });
            return;
        }

        setIsIssuing(true);
        setSubmissionError(null);
        try {
            const credentialSubject = {
                email: data.email,
            };

            const fakeHeader = btoa(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
            const fakePayload = btoa(JSON.stringify({
                sub: "demo-user",
                iss: "did:bravium:demo",
                iat: Math.floor(Date.now() / 1000),
                credentialSubject: credentialSubject,
                type: ['VerifiableCredential', selectedTemplate.name],
            }));
            const fakeSignature = btoa("fake-signature");
            const jws = `${fakeHeader}.${fakePayload}.${fakeSignature}`;
            
            const savedCredential = await saveIssuedCredential({
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                customerId: DEMO_CUSTOMER_ID,
                recipientData: credentialSubject,
                jws,
            });

            if (!savedCredential.success || !savedCredential.id) {
                throw new Error(savedCredential.message || "Failed to save demo credential record.");
            }

            setIssuedCredential({jws, id: savedCredential.id});
            toast({ title: t.issueCredentialPage.toast_success_title, description: t.issueCredentialPage.toast_success_desc });

        } catch (error: any) {
            console.error("Error issuing demo credential:", error);
            const detailedError = (error as HttpsCallableError)?.details?.originalError || error.message || "An unexpected error occurred.";
            setSubmissionError(detailedError);
            toast({ variant: "destructive", title: t.toast_error_title, description: "This is a demo. Credential issuance is simulated.", duration: 10000 });
        } finally {
            setIsIssuing(false);
        }
    };

    const handleCopy = () => {
        if (!issuedCredential) return;
        navigator.clipboard.writeText(issuedCredential.jws);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    const generateCredentialPdf = async (): Promise<Blob> => {
        if (!issuedCredential || !selectedTemplate) throw new Error("Credential not available.");
        
        const doc = new jsPDF();
        const canvas = qrCodeRef.current?.querySelector<HTMLCanvasElement>('canvas');
        
        if (!canvas) {
            throw new Error("QR Code canvas not found.");
        }
        const qrCodeImage = canvas.toDataURL('image/png');

        const page_width = doc.internal.pageSize.getWidth();
        const margin = 14;
        
        doc.setFontSize(20);
        doc.text(selectedTemplate.name, margin, 22);

        doc.addImage(qrCodeImage, 'PNG', margin, 30, 80, 80);
        
        doc.setFontSize(8);
        doc.setFont('Courier', 'normal');
        
        const jwsLines = doc.splitTextToSize(issuedCredential.jws, page_width - (margin * 2));
        doc.text(jwsLines, margin, 125);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(12);
        doc.textWithLink("Check at https://bravium.es/verify", margin, 180, { url: 'https://bravium.es/verify' });
        
        return doc.output('blob');
    };

     const handleDownloadPdf = async () => {
        try {
            const pdfBlob = await generateCredentialPdf();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(pdfBlob);
            link.download = `Bravium-Demo-Credential-${issuedCredential?.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error: any) {
             toast({ variant: "destructive", title: t.toast_error_title, description: error.message });
        }
    };

    const handleShare = async () => {
        if (!navigator.share || !issuedCredential) return;

        try {
            const pdfBlob = await generateCredentialPdf();
            const pdfFile = new File([pdfBlob], `Bravium-Demo-Credential-${issuedCredential.id}.pdf`, { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: t.credentialsPage.share_title,
                    text: t.credentialsPage.share_text,
                });
            } else {
                 toast({ variant: "destructive", title: t.toast_error_title, description: "Cannot share files on this browser." });
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') { // Ignore if user cancels share
                 toast({ variant: "destructive", title: t.toast_error_title, description: error.message });
            }
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
                            <CardTitle className="text-3xl">{t.tryNowPage.title}</CardTitle>
                            <CardDescription>{t.tryNowPage.subtitle}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 py-8">
                             <Form {...form}>
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                     <FormField
                                        control={control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t.tryNowPage.email_label}</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="tu@email.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                     <FormField
                                        control={control}
                                        name="templateId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t.tryNowPage.select_template_label}</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTemplates}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={loadingTemplates ? t.tryNowPage.loading_templates : t.tryNowPage.select_template_placeholder} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {publicTemplates.map(template => (
                                                            <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                   {t.tryNowPage.template_selection_description}
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    
                                     <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{t.tryNowPage.demo_alert_title}</AlertTitle>
                                        <AlertDescription>
                                            {t.tryNowPage.demo_alert_desc}
                                        </AlertDescription>
                                    </Alert>

                                    <div className="flex justify-center">
                                    <Button type="submit" disabled={isIssuing || !selectedTemplate} size="lg">
                                        {isIssuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                                        {t.issueCredentialPage.issue_button}
                                    </Button>
                                    </div>
                                </form>
                            </Form>
    
                            {submissionError && (
                                <Alert variant="destructive" className="mt-6">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Error Detallado</AlertTitle>
                                    <AlertDescription>
                                        <pre className="mt-2 text-xs whitespace-pre-wrap font-mono bg-transparent">
                                            {submissionError}
                                        </pre>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                 </div>
            </main>
            <LandingFooter />

            <Dialog open={!!issuedCredential} onOpenChange={(open) => !open && setIssuedCredential(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t.issueCredentialPage.result_dialog_title}</DialogTitle>
                         <DialogDescription></DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div ref={qrCodeRef} className="p-4 bg-white rounded-lg border">
                            <QRCode value={issuedCredential?.jws || ''} size={256} />
                        </div>
                        <div className="flex items-center gap-2">
                             <Button variant="outline" onClick={handleDownloadPdf}>
                                <Download className="mr-2 h-4 w-4" /> {t.credentialsPage.download_pdf_button}
                            </Button>
                             {isShareSupported && (
                                <Button variant="outline" onClick={handleShare}>
                                    <Share2 className="mr-2 h-4 w-4" /> {t.credentialsPage.share_button}
                                </Button>
                            )}
                        </div>

                        <div className="w-full space-y-2">
                             <Label htmlFor="jws-output">{t.issueCredentialPage.result_jws_label}</Label>
                            <div className="relative">
                                <Textarea id="jws-output" readOnly value={issuedCredential?.jws || ""} rows={6} className="font-mono text-xs pr-10"/>
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopy}>
                                    {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                         <Button onClick={() => setIssuedCredential(null)}>{t.issueCredentialPage.close_button}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}

    

    