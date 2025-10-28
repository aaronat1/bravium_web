
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signIn, signOut } from "@/lib/firebase/auth";


import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { db, functions, storage } from "@/lib/firebase/config";
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
const DEMO_USER_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL!;
const DEMO_USER_PASSWORD = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD!;

const getBaseSchema = (fields: CredentialTemplate['fields'] | undefined) => {
    if (!fields) return z.object({});
    
    const shape: Record<string, z.ZodType<any, any>> = {};
    fields.forEach(field => {
        let fieldSchema: z.ZodType<any, any>;
        
        switch(field.type) {
            case 'file':
                const fileSchema = z.any().refine((files) => files instanceof FileList && files.length > 0, 'File is required.');
                fieldSchema = field.required ? fileSchema : z.any().optional();
                break;
            default:
                let stringSchema = z.string();
                if (field.required) {
                    stringSchema = stringSchema.min(1, {message: "This field is required"});
                } else {
                    // For optional fields, we explicitly mark them as optional in Zod
                    stringSchema = stringSchema.optional();
                }
                fieldSchema = stringSchema;
        }
        shape[field.fieldName] = fieldSchema;
    });
    return z.object(shape);
};


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
    

    const formSchema = React.useMemo(() => getBaseSchema(selectedTemplate?.fields), [selectedTemplate]);

    type FormData = z.infer<typeof formSchema>;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });
    
    const { handleSubmit, control, watch, register, reset } = form;
    
    const handleTemplateChange = (templateId: string) => {
        const template = publicTemplates.find(t => t.id === templateId) || null;
        setSelectedTemplate(template);
    };

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
        if (selectedTemplate) {
            const defaultValues = selectedTemplate.fields.reduce((acc, field) => {
                acc[field.fieldName] = field.defaultValue || '';
                return acc;
            }, {} as Record<string, any>);
            reset(defaultValues);
        } else {
            reset({});
        }
    }, [selectedTemplate, reset]);


    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!selectedTemplate) {
            toast({ variant: "destructive", title: "Error", description: "No template selected." });
            return;
        }

        setIsIssuing(true);
        setSubmissionError(null);
        
        let demoUserSignedIn = false;

        try {
            // Sign in demo user silently
            const { error: signInError } = await signIn(DEMO_USER_EMAIL, DEMO_USER_PASSWORD);
            if (signInError) {
                throw new Error(`Demo authentication failed: ${signInError.message}`);
            }
            demoUserSignedIn = true;


            const credentialSubject: Record<string, any> = {};

            for (const fieldInfo of selectedTemplate.fields) {
                const fieldName = fieldInfo.fieldName;
                const value = data[fieldName as keyof FormData];

                if (fieldInfo.type === 'file' && value instanceof FileList && value.length > 0) {
                    const file: File = value[0];
                    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
                    if (!allowedTypes.includes(file.type)) {
                        throw new Error(`Invalid file type for ${fieldInfo.label}. Accepted formats: PDF, PNG, JPG.`);
                    }
                    const filePath = `credential-attachments/demo/${Date.now()}_${file.name}`;
                    const fileRef = ref(storage, filePath);
                    await uploadBytes(fileRef, file);
                    const downloadURL = await getDownloadURL(fileRef);
                    credentialSubject[fieldName] = downloadURL;
                } else if (value !== undefined && value !== null && value !== '') {
                    credentialSubject[fieldName] = value;
                }
            }

            const issueCredentialFunc = httpsCallable(functions, 'issueCredential');
            const result: any = await issueCredentialFunc({
                credentialSubject,
                credentialType: selectedTemplate.name,
                customerId: DEMO_CUSTOMER_ID, 
            });
            
            const jws = result.data.verifiableCredentialJws;
            if (!jws) {
                throw new Error("Cloud function did not return a verifiableCredentialJws.");
            }
            
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
            toast({ variant: "destructive", title: t.toast_error_title, description: detailedError, duration: 10000 });
        } finally {
            if (demoUserSignedIn) {
                await signOut();
            }
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
                                    
                                     <div className="space-y-2">
                                        <Label>{t.tryNowPage.select_template_label}</Label>
                                        <Select onValueChange={handleTemplateChange} disabled={loadingTemplates}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingTemplates ? t.tryNowPage.loading_templates : t.tryNowPage.select_template_placeholder} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {publicTemplates.map(template => (
                                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-sm text-muted-foreground">{t.tryNowPage.template_selection_description}</p>
                                    </div>
                                    
                                    {selectedTemplate && (
                                        <>
                                            {selectedTemplate.fields.map(fieldInfo => (
                                                <FormField
                                                    key={fieldInfo.fieldName}
                                                    control={control}
                                                    name={fieldInfo.fieldName as any}
                                                    render={({ field }) => {
                                                    const displayValue = field.value ?? '';
                                                    return (
                                                        <FormItem>
                                                            <FormLabel>{fieldInfo.label} {fieldInfo.required && '*'}</FormLabel>
                                                            <FormControl>
                                                                {(() => {
                                                                    switch(fieldInfo.type) {
                                                                        case 'date':
                                                                            return <Input type="date" {...field} value={displayValue} />;
                                                                        case 'select':
                                                                            return (
                                                                                <Select onValueChange={field.onChange} value={displayValue}>
                                                                                    <SelectTrigger><SelectValue placeholder={fieldInfo.label} /></SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {(fieldInfo.options || []).map(option => (
                                                                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            );
                                                                        case 'file':
                                                                            const { ref: fieldRef, ...rest } = register(fieldInfo.fieldName as any);
                                                                            return (
                                                                                <Input 
                                                                                    type="file" 
                                                                                    accept=".pdf,.png,.jpeg,.jpg"
                                                                                    {...rest}
                                                                                    ref={fieldRef}
                                                                                />
                                                                            );
                                                                        case 'text':
                                                                        default:
                                                                            return <Input type="text" {...field} value={displayValue} />;
                                                                    }
                                                                })()}
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    );
                                                }}
                                                />
                                            ))}
                                        </>
                                    )}
                                    
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
