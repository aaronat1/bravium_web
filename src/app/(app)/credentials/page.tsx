
"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, orderBy, type Timestamp } from "firebase/firestore";
import { PlusCircle, Loader2, Eye, Copy, Check, BadgeCheck, MoreHorizontal, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import QRCode from "qrcode.react";

import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { deleteIssuedCredential } from "@/actions/issuanceActions";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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

// MAIN PAGE COMPONENT
export default function CredentialsPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const { user } = useAuth();
    const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingCredential, setViewingCredential] = useState<IssuedCredential | null>(null);
    const [credentialToDelete, setCredentialToDelete] = useState<IssuedCredential | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: keyof IssuedCredential | 'recipient'; direction: "ascending" | "descending"; }>({ key: "issuedAt", direction: "descending" });

    const isAdmin = user?.uid === ADMIN_UID;

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const credsCollection = collection(db, "issuedCredentials");
        // For non-admin users, we perform a simpler query to avoid needing a composite index in Firestore.
        // The sorting is handled client-side by the `useMemo` hook below.
        const q = isAdmin 
            ? query(credsCollection, orderBy("issuedAt", "desc"))
            : query(credsCollection, where("customerId", "==", user.uid));
        
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
        if (!recipientData) return 'N/A';
        const name = Object.values(recipientData).find(val => typeof val === 'string' && val.split(' ').length > 1);
        const email = Object.values(recipientData).find(val => typeof val === 'string' && val.includes('@'));
        return String(name || email || Object.values(recipientData)[0] || 'N/A');
    }

    const handleDeleteCredential = () => {
        if (!credentialToDelete) return;

        startDeleteTransition(async () => {
            const result = await deleteIssuedCredential(credentialToDelete.id);
            toast({
                title: result.success ? t.credentialsPage.toast_delete_success_title : t.credentialsPage.toast_delete_error_title,
                description: result.message,
                variant: result.success ? "default" : "destructive",
            });
            setCredentialToDelete(null);
        });
    };
    
    const sortedAndFilteredCredentials = useMemo(() => {
        let filtered = credentials.filter(c =>
            c.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getRecipientPrimaryInfo(c.recipientData).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'recipient') {
                aValue = getRecipientPrimaryInfo(a.recipientData);
                bValue = getRecipientPrimaryInfo(b.recipientData);
            } else if (sortConfig.key === 'issuedAt' && a.issuedAt && b.issuedAt) {
                aValue = a.issuedAt.toMillis();
                bValue = b.issuedAt.toMillis();
            } else {
                aValue = a[sortConfig.key as keyof IssuedCredential] || '';
                bValue = b[sortConfig.key as keyof IssuedCredential] || '';
            }
            
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [credentials, searchTerm, sortConfig]);

    const handleSort = (key: keyof IssuedCredential | 'recipient') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const SortableHeader = ({ sortKey, children }: { sortKey: keyof IssuedCredential | 'recipient', children: React.ReactNode }) => (
        <TableHead onClick={() => handleSort(sortKey)} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
                {children}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 text-primary" /> : <ArrowDown className="h-4 w-4 text-primary" />
                ) : (
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />
                )}
            </div>
        </TableHead>
    );

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
                    <div className="pb-4">
                        <Input
                            placeholder={t.credentialsPage.filter_placeholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>
                    {loading ? (
                        <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader sortKey="templateName">{t.credentialsPage.col_template}</SortableHeader>
                                    <SortableHeader sortKey="recipient">{t.credentialsPage.col_recipient}</SortableHeader>
                                    <SortableHeader sortKey="issuedAt">{t.credentialsPage.col_issued_at}</SortableHeader>
                                    <TableHead>{t.credentialsPage.actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAndFilteredCredentials.length > 0 ? sortedAndFilteredCredentials.map((cred) => (
                                    <TableRow key={cred.id}>
                                        <TableCell className="font-medium">{cred.templateName}</TableCell>
                                        <TableCell>{getRecipientPrimaryInfo(cred.recipientData)}</TableCell>
                                        <TableCell>{cred.issuedAt ? new Date(cred.issuedAt.toDate()).toLocaleString() : 'N/A'}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewingCredential(cred)}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        <span>{t.credentialsPage.view_button}</span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setCredentialToDelete(cred)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>{t.credentialsPage.delete}</span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )) : null}
                            </TableBody>
                        </Table>
                    )}
                    {!loading && sortedAndFilteredCredentials.length === 0 && (
                        <div className="text-center py-10 text-muted-foreground">
                            <BadgeCheck className="mx-auto h-12 w-12" />
                            <p className="mt-4">{credentials.length > 0 && searchTerm ? t.credentialsPage.no_credentials_filter : t.credentialsPage.no_credentials}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <ViewCredentialDialog
                credential={viewingCredential}
                isOpen={!!viewingCredential}
                onOpenChange={(open) => !open && setViewingCredential(null)}
            />

            <AlertDialog open={!!credentialToDelete} onOpenChange={(open) => !open && setCredentialToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t.credentialsPage.delete_dialog_title}</AlertDialogTitle>
                        <AlertDialogDescription>{t.credentialsPage.delete_dialog_desc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t.credentialsPage.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteCredential} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t.credentialsPage.confirm}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
