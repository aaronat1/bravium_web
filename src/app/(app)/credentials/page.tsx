"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { PlusCircle, Loader2, Eye, Copy, Check, BadgeCheck, MoreHorizontal, Trash2, ArrowUpDown, ArrowUp, ArrowDown, FileDown, Calendar as CalendarIcon, X } from "lucide-react";
import QRCode from "qrcode.react";
import { format, isSameDay } from 'date-fns';
import { es, enUS } from "date-fns/locale";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";
const ITEMS_PER_PAGE = 10;

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
    const { t, locale } = useI18n();
    const { toast } = useToast();
    const { user } = useAuth();
    const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewingCredential, setViewingCredential] = useState<IssuedCredential | null>(null);
    const [credentialToDelete, setCredentialToDelete] = useState<IssuedCredential | null>(null);
    const [isDeleting, startDeleteTransition] = useTransition();

    const [searchTerm, setSearchTerm] = useState("");
    const [dateFilter, setDateFilter] = useState<Date | undefined>();
    const [sortConfig, setSortConfig] = useState<{ key: keyof IssuedCredential | 'recipient'; direction: "ascending" | "descending"; }>({ key: "issuedAt", direction: "descending" });
    const [currentPage, setCurrentPage] = useState(1);

    const isAdmin = user?.uid === ADMIN_UID;

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const credsCollection = collection(db, "issuedCredentials");
        const q = isAdmin 
            ? credsCollection
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

    const formatRecipientData = (recipientData: Record<string, any>) => {
        if (!recipientData || Object.keys(recipientData).length === 0) return 'N/A';
        return Object.keys(recipientData)
            .sort()
            .map(key => recipientData[key])
            .filter(val => val !== null && val !== undefined && val !== '')
            .join(', ');
    };

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
        let filtered = credentials.filter(c => {
            const textMatch = c.templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                formatRecipientData(c.recipientData).toLowerCase().includes(searchTerm.toLowerCase());
            
            const dateMatch = !dateFilter || (c.issuedAt && isSameDay(c.issuedAt.toDate(), dateFilter));
            
            return textMatch && dateMatch;
        });

        return filtered.sort((a, b) => {
            let aValue: any;
            let bValue: any;

            if (sortConfig.key === 'recipient') {
                aValue = formatRecipientData(a.recipientData);
                bValue = formatRecipientData(b.recipientData);
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
    }, [credentials, searchTerm, dateFilter, sortConfig]);

    const paginatedCredentials = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const items = sortedAndFilteredCredentials.slice(start, end);
        const totalPages = Math.ceil(sortedAndFilteredCredentials.length / ITEMS_PER_PAGE);
        return { items, totalPages };
    }, [sortedAndFilteredCredentials, currentPage]);

    useEffect(() => {
        if(currentPage !== 1) {
            setCurrentPage(1);
        }
    }, [searchTerm, dateFilter, sortConfig]);


    const handleSort = (key: keyof IssuedCredential | 'recipient') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    };

    const handleExportCSV = () => {
        const headers = [t.credentialsPage.col_template, t.credentialsPage.col_recipient, t.credentialsPage.col_issued_at];
        const csvContent = [
          headers.join(","),
          ...sortedAndFilteredCredentials.map(c => [
            `"${c.templateName}"`,
            `"${formatRecipientData(c.recipientData).replace(/"/g, '""')}"`,
            c.issuedAt ? format(c.issuedAt.toDate(), 'Pp', { locale: locale === 'es' ? es : enUS }) : 'N/A'
          ].join(","))
        ].join("\n");
    
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `credentials-export-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const tableData = sortedAndFilteredCredentials.map(c => [
            c.templateName,
            formatRecipientData(c.recipientData),
            c.issuedAt ? format(c.issuedAt.toDate(), 'Pp', { locale: locale === 'es' ? es : enUS }) : 'N/A'
        ]);
    
        autoTable(doc, {
            head: [[t.credentialsPage.col_template, t.credentialsPage.col_recipient, t.credentialsPage.col_issued_at]],
            body: tableData,
            startY: 20,
            didDrawPage: (data) => {
                doc.text(t.credentialsPage.list_title, data.settings.margin.left, 15);
            }
        });
    
        doc.save(`credentials-export-${new Date().toISOString().split('T')[0]}.pdf`);
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
                    <div className="flex items-center justify-between pb-4 gap-2 flex-wrap">
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative">
                                <Input
                                    placeholder={t.credentialsPage.filter_placeholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="max-w-sm pr-8"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                        onClick={() => setSearchTerm('')}
                                        aria-label="Clear search"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                             <div className="relative">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-[240px] justify-start text-left font-normal pr-8",
                                                !dateFilter && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateFilter ? format(dateFilter, "PPP", { locale: locale === 'es' ? es : enUS }) : <span>{t.credentialsPage.filter_date_placeholder}</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dateFilter}
                                            onSelect={setDateFilter}
                                            locale={locale === 'es' ? es : enUS}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                {dateFilter && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                                        onClick={() => setDateFilter(undefined)}
                                        aria-label="Clear date"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleExportCSV}>
                                <FileDown className="mr-2 h-4 w-4" />
                                {t.credentialsPage.export_csv}
                            </Button>
                            <Button variant="outline" onClick={handleExportPDF}>
                                <FileDown className="mr-2 h-4 w-4" />
                                {t.credentialsPage.export_pdf}
                            </Button>
                        </div>
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
                                {paginatedCredentials.items.length > 0 ? paginatedCredentials.items.map((cred) => (
                                    <TableRow key={cred.id}>
                                        <TableCell className="font-medium">{cred.templateName}</TableCell>
                                        <TableCell>{formatRecipientData(cred.recipientData)}</TableCell>
                                        <TableCell>{cred.issuedAt ? format(cred.issuedAt.toDate(), 'Pp', { locale: locale === 'es' ? es : enUS }) : 'N/A'}</TableCell>
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
                             <p className="mt-4">
                                {credentials.length > 0 && (searchTerm || dateFilter)
                                    ? t.credentialsPage.no_credentials_filter
                                    : t.credentialsPage.no_credentials}
                            </p>
                        </div>
                    )}
                     { !loading && sortedAndFilteredCredentials.length > 0 && (
                        <div className="flex items-center justify-between pt-4">
                            <div className="text-sm text-muted-foreground">
                            {t.credentialsPage.pagination_showing
                                .replace('{start}', Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, sortedAndFilteredCredentials.length).toString())
                                .replace('{end}', Math.min(currentPage * ITEMS_PER_PAGE, sortedAndFilteredCredentials.length).toString())
                                .replace('{total}', sortedAndFilteredCredentials.length.toString())
                            }
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    {t.credentialsPage.pagination_previous}
                                </Button>
                                <span className="text-sm font-medium whitespace-nowrap">
                                {t.credentialsPage.pagination_page
                                    .replace('{current}', currentPage.toString())
                                    .replace('{total}', paginatedCredentials.totalPages > 0 ? paginatedCredentials.totalPages.toString() : "1")
                                }
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginatedCredentials.totalPages))}
                                    disabled={currentPage === paginatedCredentials.totalPages || paginatedCredentials.totalPages === 0}
                                >
                                    {t.credentialsPage.pagination_next}
                                </Button>
                            </div>
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

    