"use client";

import { useEffect, useState, useRef, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { Users, PlusCircle, Loader2 } from "lucide-react";

import { db } from "@/lib/firebase/config";
import { addCustomer, type AddCustomerState } from "@/actions/customerActions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";

type Customer = {
  id: string;
  name: string;
  email: string;
  did: string;
  subscriptionPlan: 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
};

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      {t.customersPage.form_cta}
    </Button>
  );
}

export default function CustomersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const initialState: AddCustomerState = { message: "", success: false };
  const [state, formAction] = useActionState(addCustomer, initialState);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? t.customersPage.toast_success_title : t.customersPage.toast_error_title,
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
      if (state.success) {
        formRef.current?.reset();
      }
    }
  }, [state, toast, t]);

  useEffect(() => {
    setLoading(true);
    const q = collection(db, "customers");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Customer));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge variant="secondary">{t.customersPage.status_active}</Badge>;
      case 'inactive':
        return <Badge variant="outline">{t.customersPage.status_inactive}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t.customersPage.status_cancelled}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'starter':
        return <Badge variant="secondary">{t.customersPage.plan_starter}</Badge>;
      case 'pro':
        return <Badge variant="default">{t.customersPage.plan_pro}</Badge>;
      case 'enterprise':
        return <Badge variant="default">{t.customersPage.plan_enterprise}</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.customersPage.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t.customersPage.add_customer_card_title}</CardTitle>
              <CardDescription>{t.customersPage.add_customer_card_desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} action={formAction} className="space-y-4">
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
                <div className="space-y-2">
                  <Label htmlFor="subscriptionPlan">{t.customersPage.form_plan_label}</Label>
                  <Select name="subscriptionPlan" required>
                    <SelectTrigger id="subscriptionPlan">
                      <SelectValue placeholder={t.customersPage.form_plan_placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">{t.customersPage.plan_starter}</SelectItem>
                      <SelectItem value="pro">{t.customersPage.plan_pro}</SelectItem>
                      <SelectItem value="enterprise">{t.customersPage.plan_enterprise}</SelectItem>
                    </SelectContent>
                  </Select>
                  {state.errors?.subscriptionPlan && <p className="text-sm font-medium text-destructive">{state.errors.subscriptionPlan[0]}</p>}
                </div>
                <SubmitButton />
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{t.customersPage.list_title}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                 <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.customersPage.col_name}</TableHead>
                      <TableHead>{t.customersPage.col_email}</TableHead>
                      <TableHead>{t.customersPage.col_plan}</TableHead>
                      <TableHead className="text-right">{t.customersPage.col_status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.length > 0 && customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{getPlanBadge(customer.subscriptionPlan)}</TableCell>
                        <TableCell className="text-right">{getStatusBadge(customer.subscriptionStatus)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
               { !loading && customers.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12" />
                    <p className="mt-4">{t.customersPage.no_customers}</p>
                  </div>
                )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
