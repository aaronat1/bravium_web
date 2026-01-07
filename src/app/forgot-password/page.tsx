"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from "@/lib/firebase/auth";
import { useI18n } from "@/hooks/use-i18n";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);

    const formSchema = z.object({
        email: z.string().email({ message: t.forgotPasswordPage.email_error }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        const { error } = await sendPasswordResetEmail(values.email);
        setLoading(false);

        if (error) {
            toast({
                variant: "destructive",
                title: t.forgotPasswordPage.toast_fail_title,
                description: t.forgotPasswordPage.toast_fail_desc,
            });
        } else {
            toast({
                title: t.forgotPasswordPage.toast_success_title,
                description: t.forgotPasswordPage.toast_success_desc,
            });
            // Optional: Redirect to login after a delay
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto bg-primary text-primary-foreground rounded-full p-3 w-fit mb-4">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold">{t.forgotPasswordPage.title}</CardTitle>
                    <CardDescription>{t.forgotPasswordPage.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.forgotPasswordPage.email_label}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t.forgotPasswordPage.email_placeholder} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.forgotPasswordPage.submit_button}
                            </Button>
                        </form>
                    </Form>
                    <div className="mt-6 text-center space-y-2">
                        <Button variant="link" asChild className="w-full">
                            <Link href="/login">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {t.forgotPasswordPage.back_to_login}
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
