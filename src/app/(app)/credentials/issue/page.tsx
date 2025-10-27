
"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import QRCode from "qrcode.react";
import { httpsCallable, type HttpsCallableError } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import jsPDF from "jspdf";
import { format } from "date-fns";


import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { db, functions, storage } from "@/lib/firebase/config";
import { saveIssuedCredential } from "@/actions/issuanceActions";
import type { CredentialTemplate } from "@/app/(app)/templates/page";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, Copy, Check, AlertTriangle, Download, Share2, FileUp, FileDown, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

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


function BatchResultDialog({ results, onOpenChange }: { results: { success: boolean; data: any; error?: string }[], onOpenChange: (open: boolean) => void }) {
    const { t } = useI18n();
    const successfulCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return (
        <Dialog open={results.length > 0} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.issueCredentialPage.batch_result_title}</DialogTitle>
                    <DialogDescription>
                        {t.issueCredentialPage.batch_result_desc.replace('{success}', successfulCount.toString()).replace('{total}', results.length.toString())}
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {results.map((result, index) => (
                        <div key={index} className={`flex items-start p-2 rounded-md ${result.success ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                            {result.success ? <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" /> : <XCircle className="h-5 w-5 text-red-600 mr-3 mt-1 flex-shrink-0" />}
                            <div className="flex-grow">
                                <p className="text-sm font-medium">
                                    {t.issueCredentialPage.batch_result_row} #{index + 1}: {Object.values(result.data)[0]}
                                </p>
                                {!result.success && <p className="text-xs text-red-700 dark:text-red-400">{result.error}</p>}
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>{t.issueCredentialPage.close_button}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function IssueCredentialPage() {
    const { t } = useI18n();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [templates, setTemplates] = useState<CredentialTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<CredentialTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [issuedCredential, setIssuedCredential] = useState<{jws: string, id: string} | null>(null);
    const [hasCopied, setHasCopied] = useState(false);
    const [submissionError, setSubmissionError] = useState<string | null>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const isShareSupported = typeof navigator !== 'undefined' && !!navigator.share;
    
    // Batch state
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isBatchIssuing, setIsBatchIssuing] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchResults, setBatchResults] = useState<{ success: boolean; data: any; error?: string }[]>([]);

    const hasFileField = selectedTemplate?.fields.some(f => f.type === 'file') ?? false;

    const isAdmin = user?.uid === ADMIN_UID;

    const formSchema = React.useMemo(() => getBaseSchema(selectedTemplate?.fields), [selectedTemplate]);

    type FormData = z.infer<typeof formSchema>;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
    });
    
    const { handleSubmit, reset, control, register } = form;

    useEffect(() => {
        if (!user) return;
        setLoadingTemplates(true);
        const templatesCollectionRef = collection(db, "credentialSchemas");
        const q = isAdmin ? templatesCollectionRef : query(templatesCollectionRef, where("customerId", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CredentialTemplate));
            setTemplates(fetchedTemplates);
            setLoadingTemplates(false);
        }, (error) => {
            console.error("Error fetching templates:", error);
            toast({ variant: "destructive", title: t.toast_error_title, description: "Failed to load templates." });
            setLoadingTemplates(false);
        });
        
        return () => unsubscribe();
    }, [user, isAdmin, t, toast]);

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


    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === templateId) || null;
        setSelectedTemplate(template);
        setSubmissionError(null);
        setCsvFile(null);
        setBatchResults([]);
        setBatchProgress(0);
    };

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!selectedTemplate || !user) return;
        setIsIssuing(true);
        setSubmissionError(null);
        try {
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
                    const filePath = `credential-attachments/${user.uid}/${Date.now()}_${file.name}`;
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
                customerId: selectedTemplate.customerId,
            });
            
            const jws = result.data.verifiableCredentialJws;
            if (!jws) {
                throw new Error("Cloud function did not return a verifiableCredentialJws.");
            }
            
            const savedCredential = await saveIssuedCredential({
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                customerId: selectedTemplate.customerId,
                recipientData: credentialSubject,
                jws,
            });

            if (!savedCredential.success || !savedCredential.id) {
                throw new Error(savedCredential.message || "Failed to save credential record.");
            }

            setIssuedCredential({jws, id: savedCredential.id});

            toast({ title: t.issueCredentialPage.toast_success_title, description: t.issueCredentialPage.toast_success_desc });

        } catch (error: any) {
            console.error("Error issuing credential:", error);
            const detailedError = (error as HttpsCallableError)?.details?.originalError || error.message || "An unexpected error occurred.";
            setSubmissionError(detailedError);
            toast({ variant: "destructive", title: t.toast_error_title, description: detailedError, duration: 10000 });
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
        if (!issuedCredential) throw new Error("Credential not available.");
        
        const doc = new jsPDF();
        const canvas = qrCodeRef.current?.querySelector<HTMLCanvasElement>('canvas');
        
        if (!canvas) {
            throw new Error("QR Code canvas not found.");
        }
        const qrCodeImage = canvas.toDataURL('image/png');

        const page_width = doc.internal.pageSize.getWidth();
        const margin = 14;
        
        doc.setFontSize(20);
        doc.text(selectedTemplate?.name || "Verifiable Credential", margin, 22);

        doc.addImage(qrCodeImage, 'PNG', margin, 30, 80, 80);
        
        doc.setFontSize(8);
        doc.setFont('Courier', 'normal');
        
        const jwsLines = doc.splitTextToSize(issuedCredential.jws, page_width - (margin * 2));
        doc.text(jwsLines, margin, 125, { maxWidth: page_width - 28 });

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
            link.download = `Bravium-Credential-${issuedCredential?.id}.pdf`;
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
            const pdfFile = new File([pdfBlob], `Bravium-Credential-${issuedCredential.id}.pdf`, { type: 'application/pdf' });

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

    // Batch Issuance Functions
    const handleDownloadCsvTemplate = () => {
        if (!selectedTemplate) return;
    
        const relevantFields = selectedTemplate.fields.filter(field => field.type !== 'file');
        const headers = relevantFields.map(field => field.fieldName);
        
        const exampleRow = relevantFields.map(field => {
            switch (field.type) {
                case 'text':
                    return 'Texto de ejemplo';
                case 'date':
                    return format(new Date(), 'yyyy-MM-dd');
                case 'select':
                    return field.options?.[0] || 'Opción1';
                default:
                    return '';
            }
        });
    
        const csvContent = [
            headers.join(','),
            exampleRow.join(',')
        ].join('\n');
    
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${selectedTemplate.name.replace(/\s+/g, '_')}_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBatchIssue = async () => {
        if (!csvFile || !selectedTemplate || !user) return;

        setIsBatchIssuing(true);
        setBatchProgress(0);
        setBatchResults([]);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvContent = event.target?.result as string;
            const lines = csvContent.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length <= 1) { // Only headers or empty
                 toast({ variant: "destructive", title: "Archivo CSV vacío", description: "El archivo no contiene filas de datos para procesar." });
                setIsBatchIssuing(false);
                return;
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const dataRows = lines.slice(1);

            const totalRows = dataRows.length;
            const issueCredentialFunc = httpsCallable(functions, 'issueCredential');
            const tempResults = [];

            for (let i = 0; i < totalRows; i++) {
                const row = dataRows[i];
                const values = row.split(',').map(v => v.trim());
                const credentialSubject = headers.reduce((acc, header, index) => {
                    acc[header] = values[index];
                    return acc;
                }, {} as Record<string, any>);

                try {
                    const result: any = await issueCredentialFunc({
                        credentialSubject,
                        credentialType: selectedTemplate.name,
                        customerId: selectedTemplate.customerId,
                    });
                    
                    const jws = result.data.verifiableCredentialJws;
                    if (!jws) throw new Error("Cloud function did not return JWS.");
                    
                    await saveIssuedCredential({
                        templateId: selectedTemplate.id,
                        templateName: selectedTemplate.name,
                        customerId: selectedTemplate.customerId,
                        recipientData: credentialSubject,
                        jws,
                    });

                    tempResults.push({ success: true, data: credentialSubject });
                } catch (error: any) {
                    const detailedError = (error as HttpsCallableError)?.details?.originalError || error.message || "An unexpected error occurred.";
                    tempResults.push({ success: false, data: credentialSubject, error: detailedError });
                }
                setBatchProgress(((i + 1) / totalRows) * 100);
            }
            setBatchResults(tempResults);
            setIsBatchIssuing(false);
        };
        reader.readAsText(csvFile);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t.issueCredentialPage.title}</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t.issueCredentialPage.step1_title}</CardTitle>
                    <CardDescription>{t.issueCredentialPage.step1_desc}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingTemplates ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                        <Select onValueChange={handleTemplateChange} disabled={templates.length === 0}>
                            <SelectTrigger className="w-full md:w-1/2">
                                <SelectValue placeholder={t.issueCredentialPage.select_template_placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedTemplate && (
                <Tabs defaultValue="single" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">{t.issueCredentialPage.tab_single}</TabsTrigger>
                        <TabsTrigger value="batch">{t.issueCredentialPage.tab_batch}</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="single">
                        <Card>
                            <CardHeader>
                                <CardTitle>{t.issueCredentialPage.step2_title}</CardTitle>
                                <CardDescription>{t.issueCredentialPage.step2_desc.replace('{templateName}', selectedTemplate.name)}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Form {...form}>
                                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                                        <Button type="submit" disabled={isIssuing}>
                                            {isIssuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                                            {t.issueCredentialPage.issue_button}
                                        </Button>
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
                    </TabsContent>

                    <TabsContent value="batch">
                        <Card>
                             <CardHeader>
                                <CardTitle>{t.issueCredentialPage.batch_title}</CardTitle>
                                <CardDescription>{t.issueCredentialPage.batch_desc}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                               {hasFileField ? (
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>{t.issueCredentialPage.batch_file_error_title}</AlertTitle>
                                        <AlertDescription>{t.issueCredentialPage.batch_file_error_desc}</AlertDescription>
                                    </Alert>
                               ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label>{t.issueCredentialPage.batch_step1_title}</Label>
                                        <p className="text-sm text-muted-foreground">{t.issueCredentialPage.batch_step1_desc}</p>
                                        <Button variant="outline" onClick={handleDownloadCsvTemplate}>
                                            <FileDown className="mr-2 h-4 w-4" />
                                            {t.issueCredentialPage.batch_download_button}
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="csv-upload">{t.issueCredentialPage.batch_step2_title}</Label>
                                         <p className="text-sm text-muted-foreground">{t.issueCredentialPage.batch_step2_desc}</p>
                                        <Input 
                                            id="csv-upload"
                                            type="file" 
                                            accept=".csv"
                                            onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                                        />
                                    </div>
                                    <Button onClick={handleBatchIssue} disabled={!csvFile || isBatchIssuing}>
                                        {isBatchIssuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                        {t.issueCredentialPage.batch_issue_button}
                                    </Button>

                                    {isBatchIssuing && (
                                        <div className="space-y-2">
                                            <Label>{t.issueCredentialPage.batch_progress_title}</Label>
                                            <Progress value={batchProgress} />
                                            <p className="text-sm text-muted-foreground text-center">{Math.round(batchProgress)}%</p>
                                        </div>
                                    )}
                                </>
                               )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}

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
                        <Button onClick={() => router.push('/credentials')}>{t.issueCredentialPage.back_to_list_button}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <BatchResultDialog 
                results={batchResults}
                onOpenChange={(open) => { if(!open) setBatchResults([]) }}
            />

        </div>
    );
}

