
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import QRCode from "qrcode.react";
import { httpsCallable } from 'firebase/functions';

import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { db, functions } from "@/lib/firebase/config";
import { saveIssuedCredential } from "@/actions/issuanceActions";
import type { CredentialTemplate } from "@/app/(app)/templates/page";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, FileCheck, Copy, Check, Calendar, Type, ToyBrick, File as FileIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

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

    const form = useForm();
    const { handleSubmit, register, reset, control } = form;

    useEffect(() => {
        if (!user) return;
        setLoadingTemplates(true);
        const templatesCollection = collection(db, "credentialSchemas");
        const q = isAdmin ? templatesCollection : query(templatesCollection, where("customerId", "==", user.uid));
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
    }, [user, isAdmin, toast, t]);

    const handleTemplateChange = (templateId: string) => {
        const template = templates.find(t => t.id === templateId) || null;
        setSelectedTemplate(template);
        reset({});
    };

    const onSubmit = async (data: any) => {
        if (!selectedTemplate) return;

        setIsIssuing(true);
        const issueCredential = httpsCallable(functions, 'issueCredential');

        try {
            const result: any = await issueCredential({
                credentialSubject: data,
                credentialType: selectedTemplate.name
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
                recipientData: data,
                jws,
            });

            toast({ title: t.issueCredentialPage.toast_success_title, description: t.issueCredentialPage.toast_success_desc });

        } catch (error: any) {
            console.error("Error issuing credential:", error);
            toast({ variant: "destructive", title: t.toast_error_title, description: error.message });
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

    const renderField = (field: CredentialTemplate['fields'][0]) => {
        const commonProps = {
            id: field.fieldName,
            ...register(field.fieldName, { required: field.required ? t.issueCredentialPage.required_field_error : false })
        };

        switch(field.type) {
            case 'date':
                return <Input type="date" {...commonProps} />;
            case 'select':
                return (
                    <Select onValueChange={(value) => form.setValue(field.fieldName, value)} >
                        <SelectTrigger><SelectValue placeholder={field.label} /></SelectTrigger>
                        <SelectContent>
                            {(field.options || []).map(option => (
                                <SelectItem key={option} value={option}>{option}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );
            case 'file': // For now, file is a text input for a URL
                 return <Input type="text" placeholder={t.issueCredentialPage.file_placeholder} {...commonProps} />;
            case 'text':
            default:
                return <Input type="text" {...commonProps} />;
        }
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
                                {selectedTemplate.fields.map(field => (
                                    <FormField
                                        key={field.fieldName}
                                        control={control}
                                        name={field.fieldName}
                                        rules={{ required: field.required }}
                                        render={() => (
                                            <FormItem>
                                                <FormLabel>{field.label} {field.required && '*'}</FormLabel>
                                                {renderField(field)}
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
                             <FormLabel htmlFor="jws-output">{t.issueCredentialPage.result_jws_label}</FormLabel>
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
