
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Users, ClipboardList, Loader2, BadgeCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase/config";
import { useI18n } from "@/hooks/use-i18n";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

export default function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [customerCount, setCustomerCount] = useState<number | null>(null);
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [credentialCount, setCredentialCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!user) return; 

    setLoading(true);
    const customerQuery = collection(db, "customers");
    
    const templateCollection = collection(db, "credentialSchemas");
    const templateQuery = isAdmin ? templateCollection : query(templateCollection, where("customerId", "==", user.uid));
    
    const credentialCollection = collection(db, "issuedCredentials");
    const credentialQuery = isAdmin ? credentialCollection : query(credentialCollection, where("customerId", "==", user.uid));


    const unsubTemplates = onSnapshot(templateQuery, (snap) => {
      setTemplateCount(snap.size);
    }, (error) => {
      console.error("Error fetching template count:", error);
      setTemplateCount(0);
    });

    const unsubCredentials = onSnapshot(credentialQuery, (snap) => {
      setCredentialCount(snap.size);
    }, (error) => {
        console.error("Error fetching credential count:", error);
        setCredentialCount(0);
    });

    let unsubCustomers: () => void = () => {};
    if (isAdmin) {
      unsubCustomers = onSnapshot(customerQuery, (snap) => {
        setCustomerCount(snap.size);
      }, (error) => {
        console.error("Error fetching customer count:", error);
        setCustomerCount(0);
      });
    }

    const promises = [
        new Promise(resolve => onSnapshot(templateQuery, resolve)),
        new Promise(resolve => onSnapshot(credentialQuery, resolve)),
    ];

    if (isAdmin) {
        promises.push(new Promise(resolve => onSnapshot(customerQuery, resolve)));
    }

    Promise.all(promises).then(() => {
        setLoading(false);
    });

    return () => {
      unsubCustomers();
      unsubTemplates();
      unsubCredentials();
    };
  }, [user, isAdmin]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.dashboard.total_customers}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <div className="text-2xl font-bold">{customerCount}</div>
                )}
                <Button variant="link" asChild className="px-0">
                    <Link href="/customers">{t.dashboard.manage_customers}</Link>
                </Button>
            </CardContent>
            </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.total_templates}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <div className="text-2xl font-bold">{templateCount}</div>
            )}
            <Button variant="link" asChild className="px-0">
                <Link href="/templates">{t.dashboard.manage_templates}</Link>
            </Button>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.dashboard.total_credentials}</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
                <div className="text-2xl font-bold">{credentialCount}</div>
            )}
            <Button variant="link" asChild className="px-0">
                <Link href="/credentials">{t.dashboard.manage_credentials}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>{t.dashboard.welcome_title}</CardTitle>
            <CardDescription>{t.dashboard.welcome_desc}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">{t.dashboard.welcome_text}</p>
        </CardContent>
       </Card>

    </div>
  );
}
