
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, Save, KeyRound, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/lib/firebase/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { updateProfileName, sendPasswordReset, deleteOwnAccount, type UpdateNameState } from "@/actions/profileActions";
import { Badge } from "@/components/ui/badge";

function ProfileSubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      {t.profilePage.save_button}
    </Button>
  );
}

export default function ProfilePage() {
  const { user, customerData, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  const [isPasswordResetting, startPasswordReset] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const initialState: UpdateNameState = { message: "", success: false };
  const [state, formAction] = useActionState(updateProfileName, initialState);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? t.toast_success_title : t.toast_error_title,
        description: state.success ? t.profilePage.name_update_success : `${t.profilePage.name_update_fail}: ${state.message}`,
        variant: state.success ? "default" : "destructive",
      });
    }
  }, [state, t, toast]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handlePasswordReset = () => {
    if (!user?.email) return;
    startPasswordReset(async () => {
      const result = await sendPasswordReset(user.email!);
      toast({
        title: result.success ? t.toast_success_title : t.toast_error_title,
        description: result.success ? t.profilePage.password_reset_success : `${t.profilePage.password_reset_fail}: ${result.message}`,
        variant: result.success ? "default" : "destructive",
      });
    });
  };

  const handleDeleteAccount = () => {
    if (!user?.uid) return;
    startDelete(async () => {
      const result = await deleteOwnAccount(user.uid);
       toast({
        title: result.success ? t.toast_success_title : t.toast_error_title,
        description: result.success ? t.profilePage.delete_account_success : `${t.profilePage.delete_account_fail}: ${result.message}`,
        variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
        await signOut();
        router.push("/login");
      }
    });
  };

   const getPlanText = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'free': return t.customersPage.plan_free;
      case 'starter': return t.customersPage.plan_starter;
      case 'pro': return t.customersPage.plan_pro;
      case 'enterprise': return t.customersPage.plan_enterprise;
      default: return plan;
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return t.customersPage.status_active;
      case 'inactive': return t.customersPage.status_inactive;
      case 'cancelled': return t.customersPage.status_cancelled;
      default: return status;
    }
  };


  if (authLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  if (!user || !customerData) {
    // This could happen for an admin user or if the customer doc is missing.
    // Admins are redirected from /customers, other users should have a doc.
     return (
      <Card>
        <CardHeader>
          <CardTitle>{t.toast_error_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Could not load user data. Please try logging in again.</p>
          <Button onClick={handleLogout} className="mt-4">
            <LogOut className="mr-2 h-4 w-4"/>
            {t.profilePage.logout_button}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t.profilePage.title}</h1>
        <p className="text-muted-foreground">{t.profilePage.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.profilePage.profile_details_title}</CardTitle>
          <CardDescription>{t.profilePage.profile_details_desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4 max-w-lg">
            <input type="hidden" name="userId" value={user.uid} />
            <div className="space-y-2">
              <Label htmlFor="name">{t.profilePage.name_label}</Label>
              <Input id="name" name="name" defaultValue={customerData.name} />
              {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.profilePage.email_label}</Label>
              <Input id="email" type="email" value={customerData.email} disabled />
            </div>
            <ProfileSubmitButton />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.profilePage.account_info_title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t.profilePage.plan_label}</Label>
            <Badge variant="secondary">{getPlanText(customerData.subscriptionPlan)}</Badge>
          </div>
          <div className="space-y-2">
            <Label>{t.profilePage.status_label}</Label>
            <Badge variant={customerData.subscriptionStatus === 'active' ? 'secondary' : 'destructive'}>
              {getStatusText(customerData.subscriptionStatus)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.profilePage.security_title}</CardTitle>
          <CardDescription>{t.profilePage.security_desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handlePasswordReset} disabled={isPasswordResetting}>
            {isPasswordResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <KeyRound className="mr-2 h-4 w-4" />}
            {t.profilePage.change_password_button}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">{t.profilePage.danger_zone_title}</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t.profilePage.delete_account_button}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.profilePage.delete_account_dialog_title}</AlertDialogTitle>
                <AlertDialogDescription>{t.profilePage.delete_account_dialog_desc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.profilePage.cancel_button}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                  {t.profilePage.delete_account_confirm_button}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
