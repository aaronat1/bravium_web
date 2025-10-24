
"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { collection, onSnapshot, query, where } from "firebase/firestore";
import QRCode from "qrcode.react";
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
import { Loader2, FileCheck, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

// This function lives outside the component to avoid being recreated on every render.
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
                const stringSchema = z.string({
                    required_error: "This field is required.",
                });
                fieldSchema = field.required ? stringSchema.min(1, {message: "This field is required"}) : stringSchema.optional();
        }
        shape[field.fieldName] = fieldSchema;
    });
    return z.object(shape);
};

export default function IssueCredentialPage() {
    const { t } = useI18n();
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();
    const [templates, setTemplates] = useState<CredentialTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<CredentialTemplate | null>(null);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [isIssuing, setIsIssuing] = useState(false);
    const [issuedCredential, setIssuedCredential] = useState<string | null>(null);
    const [hasCopied, setHasCopied] = useState(false);

    const isAdmin = user?.uid === ADMIN_UID;

    const formSchema = React.useMemo(() => getBaseSchema(selectedTemplate?.fields), [selectedTemplate]);

    type FormData = z.infer<typeof formSchema>;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {}, // Initialize with empty defaults
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

    // This is the correct pattern to reset the form with new default values
    useEffect(() => {
        if (selectedTemplate) {
            const defaultValues = selectedTemplate.fields.reduce((acc, field) => {
                acc[field.fieldName] = field.defaultValue || '';
                return acc;
            }, {} as Record<string, any>);
            reset(defaultValues);
        } else {
            reset({}); // Clear form if no template is selected
        }
    }, [selectedTemplate, reset]);


    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === templateId) || null;
        setSelectedTemplate(template);
    };

    const onSubmit: SubmitHandler<FormData> = async (data) => {
        if (!selectedTemplate || !user) return;
        setIsIssuing(true);
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
                } else if (value) {
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
            setIssuedCredential(jws);

            await saveIssuedCredential({
                templateId: selectedTemplate.id,
                templateName: selectedTemplate.name,
                customerId: selectedTemplate.customerId,
                recipientData: credentialSubject,
                jws,
            });
            toast({ title: t.issueCredentialPage.toast_success_title, description: t.issueCredentialPage.toast_success_desc });

        } catch (error: any) {
            console.error("Error issuing credential:", error);
            const errorMessage = error.message || "An unexpected error occurred.";
            toast({ variant: "destructive", title: t.toast_error_title, description: errorMessage });
        } finally {
            setIsIssuing(false);
        }
    };

    const handleCopy = () => {
        if (!issuedCredential) return;
        navigator.clipboard.writeText(issuedCredential);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
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
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{fieldInfo.label} {fieldInfo.required && '*'}</FormLabel>
                                                <FormControl>
                                                    {(() => {
                                                        const fieldWithValue = {...field, value: field.value || ''};
                                                        switch(fieldInfo.type) {
                                                            case 'date':
                                                                return <Input type="date" {...fieldWithValue} />;
                                                            case 'select':
                                                                return (
                                                                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                                                                return <Input type="text" {...fieldWithValue} />;
                                                        }
                                                    })()}
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                                <Button type="submit" disabled={isIssuing}>
                                    {isIssuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                                    {t.issueCredentialPage.issue_button}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                 </Card>
            )}

            <Dialog open={!!issuedCredential} onOpenChange={(open) => !open && setIssuedCredential(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t.issueCredentialPage.result_dialog_title}</DialogTitle>
                        <DialogDescription>{t.issueCredentialPage.result_dialog_desc}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-6 py-4">
                        <div className="p-4 bg-white rounded-lg border">
                            <QRCode value={issuedCredential!} size={256} />
                        </div>
                        <div className="w-full space-y-2">
                             <Label htmlFor="jws-output">{t.issueCredentialPage.result_jws_label}</Label>
                            <div className="relative">
                                <Textarea id="jws-output" readOnly value={issuedCredential || ""} rows={6} className="font-mono text-xs pr-10"/>
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

        </div>
    );
}

    