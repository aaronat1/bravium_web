
"use client";

import { useRef, useActionState, useEffect } from "react";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { sendContactMessage } from "@/actions/contactActions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactForm() {
    const { t } = useI18n();
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();
    const [state, formAction] = useActionState(sendContactMessage, { message: "", success: false, errors: {} });

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? t.landingPage.contact.toast_success_title : t.landingPage.contact.toast_error_title,
                description: state.success ? t.landingPage.contact.toast_success_desc : state.message,
                variant: state.success ? "default" : "destructive",
            });
            if (state.success) {
                formRef.current?.reset();
            }
        }
    }, [state, t, toast]);

    return (
        <Card className="mt-12">
            <CardContent className="pt-6">
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div>
                        <Label htmlFor="name">{t.landingPage.contact.form_name}</Label>
                        <Input id="name" name="name" placeholder={t.landingPage.contact.form_name_placeholder} required />
                        {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
                    </div>
                    <div>
                        <Label htmlFor="email">{t.landingPage.contact.form_email}</Label>
                        <Input id="email" name="email" type="email" placeholder={t.landingPage.contact.form_email_placeholder} required />
                        {state.errors?.email && <p className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>}
                    </div>
                    <div>
                        <Label htmlFor="subject">{t.landingPage.contact.form_subject}</Label>
                        <Input id="subject" name="subject" placeholder={t.landingPage.contact.form_subject_placeholder} required />
                        {state.errors?.subject && <p className="text-sm font-medium text-destructive">{state.errors.subject[0]}</p>}
                    </div>
                    <div>
                        <Label htmlFor="message">{t.landingPage.contact.form_message}</Label>
                        <Textarea id="message" name="message" placeholder={t.landingPage.contact.form_message_placeholder} required rows={5}/>
                        {state.errors?.message && <p className="text-sm font-medium text-destructive">{state.errors.message[0]}</p>}
                    </div>
                    <Button type="submit" disabled={state.success}>{t.landingPage.contact.form_cta}</Button>
                </form>
            </CardContent>
        </Card>
    );
}

    