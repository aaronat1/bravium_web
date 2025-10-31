
"use client";

import { useEffect, useState, useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2, UserPlus, Check, Copy, Info } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { addCustomer, type AddCustomerState } from "@/actions/customerActions";

import LandingHeader from "@/components/landing-header";
import LandingFooter from "@/components/landing-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type NewUserInfo = {
  uid: string;
  email: string;
}

function RegisterSubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      {t.registerPage.cta}
    </Button>
  );
}

function NewUserCredentialsDialog({ userInfo, isOpen, onOpenChange }: { userInfo: NewUserInfo | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { t } = useI18n();
    const [hasCopied, setHasCopied] = useState(false);

    if (!userInfo) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(userInfo.uid);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.registerPage.newUserDialog.title}</DialogTitle>
                    <DialogDescription>{t.registerPage.newUserDialog.desc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>{t.registerPage.newUserDialog.alert_title}</AlertTitle>
                        <AlertDescription>{t.registerPage.newUserDialog.alert_desc}</AlertDescription>
                    </Alert>
                    <div>
                        <Label htmlFor="newUserEmail">{t.customersPage.form_email_label}</Label>
                        <Input id="newUserEmail" readOnly value={userInfo.email} />
                    </div>
                    <div>
                        <Label htmlFor="newUserPassword">{t.loginPage.password_label}</Label>
                        <div className="relative">
                            <Input id="newUserPassword" readOnly value={userInfo.uid} className="pr-10 font-mono" />
                            <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2" onClick={handleCopy}>
                                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                <span className="sr-only">Copy password</span>
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button onClick={() => onOpenChange(false)} variant="outline" className="w-full sm:w-auto">{t.customersPage.close_button}</Button>
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/login">{t.registerPage.newUserDialog.login_button}</Link>
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RegisterPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const [newlyCreatedUser, setNewlyCreatedUser] = useState<NewUserInfo | null>(null);

    const initialState: AddCustomerState = { message: "", success: false, errors: {} };
    const [state, formAction] = useActionState(addCustomer, initialState);

    useEffect(() => {
        if (state.message) {
            if (state.success) {
                toast({
                    title: t.registerPage.toast_success_title,
                    description: state.message,
                });
                if (state.newUser) {
                    setNewlyCreatedUser(state.newUser);
                }
                formRef.current?.reset();
            } else {
                toast({
                    title: t.toast_error_title,
                    description: state.message,
                    variant: "destructive",
                });
            }
        }
    }, [state, toast, t]);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <LandingHeader />
            <main className="flex-grow flex items-center justify-center container py-12">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center">
                        <h1 className="text-2xl font-bold">{t.registerPage.title}</h1>
                        <CardDescription>{t.registerPage.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form ref={formRef} action={formAction} className="space-y-4">
                            <input type="hidden" name="subscriptionPlan" value="free" />
                            <div className="space-y-2">
                                <Label htmlFor="name">{t.customersPage.form_name_label}</Label>
                                <Input id="name" name="name" placeholder={t.customersPage.form_name_placeholder} required />
                                {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t.customersPage.form_email_label}</Label>
                                <Input id="email" name="email" type="email" placeholder={t.customersPage.form_email_placeholder} required />
                                {state.errors?.email && <p className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>}
                            </div>
                            <RegisterSubmitButton />
                        </form>
                    </CardContent>
                </Card>
            </main>
            <LandingFooter />

            <NewUserCredentialsDialog
                userInfo={newlyCreatedUser}
                isOpen={!!newlyCreatedUser}
                onOpenChange={(open) => !open && setNewlyCreatedUser(null)}
            />
        </div>
    )
}
