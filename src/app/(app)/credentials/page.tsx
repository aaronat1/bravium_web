
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, orderBy, type Timestamp } from "firebase/firestore";
import { PlusCircle, Loader2, Eye, Copy, Check, BadgeCheck } from "lucide-react";
import QRCode from "qrcode.react";

import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

type IssuedCredential = {
    id: string;
    templateName: string;
    recipientData: Record<string, any>;
    issuedAt: Timestamp;
    jws: string;
    customerId: string;
};

function ViewCredentialDialog({ credential, isOpen, onOpenChange }: { credential: IssuedCredential | null, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { t } = useI18n();
    const [hasCopied, setHasCopied] = useState(false);

    if (!credential) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(credential.jws);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{t.credentialsPage.view_dialog_title}</DialogTitle>
                    <DialogDescription>{t.credentialsPage.view_dialog_desc}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center gap-6 py-4">
                    <div className="p-4 bg-white rounded-lg border">
                        <QRCode value={credential.jws} size={256} />
                    </div>
                    <div className="w-full space-y-2">
                         <Label htmlFor="jws-output">{t.issueCredentialPage.result_jws_label}</Label>
                        <div className="relative">
                            <Textarea id="jws-output" readOnly value={credential.jws} rows={6} className="font-mono text-xs pr-10"/>
                            <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={handleCopy}>
                                {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t.credentialsPage.close_button}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CredentialsPage() {
    const { t } = useI18n();
    const { user } = useAuth();
    const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingCredential, setViewingCredential] = useState<IssuedCredential | null>(null);

    const isAdmin = user?.uid === ADMIN_UID;

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const credsCollection = collection(db, "issuedCredentials");
        const q = isAdmin 
            ? query(credsCollection, orderBy("issuedAt", "desc"))
            : query(credsCollection, where("customerId", "==", user.uid), orderBy("issuedAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IssuedCredential));
            setCredentials(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching credentials:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, isAdmin]);

    const getRecipientPrimaryInfo = (recipientData: Record<string, any>) => {
        const name = Object.values(recipientData).find(val => typeof val === 'string' && val.split(' ').length > 1);
        const email = Object.values(recipientData).find(val => typeof val === 'string' && val.includes('@'));
        return name || email || Object.values(recipientData)[0] || 'N/A';
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">{t.credentialsPage.title}</h1>
                 <Button asChild>
                    <Link href="/credentials/issue">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t.credentialsPage.issue_new_button}
                    </Link>
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t.credentialsPage.list_title}</CardTitle>
                    <CardDescription>{t.credentialsPage.list_desc}</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t.credentialsPage.col_template}</TableHead>
                                    <TableHead>{t.credentialsPage.col_recipient}</TableHead>
                                    <TableHead>{t.credentialsPage.col_issued_at}</TableHead>
                                    <TableHead>{t.credentialsPage.col_actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {credentials.length > 0 ? credentials.map((cred) => (
                                    <TableRow key={cred.id}>
                                        <TableCell className="font-medium">{cred.templateName}</TableCell>
                                        <TableCell>{getRecipientPrimaryInfo(cred.recipientData)}</TableCell>
                                        <TableCell>{cred.issuedAt ? new Date(cred.issuedAt.toDate()).toLocaleString() : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => setViewingCredential(cred)}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                {t.credentialsPage.view_button}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                )) : null}
                            </TableBody>
                        </Table>
                    )}
                    {!loading && credentials.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <BadgeCheck className="mx-auto h-12 w-12" />
                            <p className="mt-4">{t.credentialsPage.no_credentials}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ViewCredentialDialog
                credential={viewingCredential}
                isOpen={!!viewingCredential}
                onOpenChange={(open) => !open && setViewingCredential(null)}
            />
        </div>
    );
}
