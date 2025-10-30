
"use client";

import { useEffect, useState, useRef, useActionState, useMemo, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { collection, onSnapshot, type Timestamp } from "firebase/firestore";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Users, PlusCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Pencil, Trash2, FileDown, Copy, Check, Info, KeyRound } from "lucide-react";

import { db } from "@/lib/firebase/config";
import { addCustomer, type AddCustomerState, deleteCustomer, updateCustomer, type UpdateCustomerState } from "@/actions/customerActions";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type Customer = {
  id: string;
  name: string;
  email: string;
  did?: string;
  subscriptionPlan: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  kmsKeyPath?: string;
  apiKey?: string;
  createdAt?: Timestamp;
  renewalDate?: Timestamp;
  onboardingStatus?: 'pending' | 'completed' | 'failed';
};

type NewUserInfo = {
  uid: string;
  email: string;
}

// --- DIALOGS AND FORMS ---

function AddCustomerSubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useI18n();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      {t.customersPage.form_cta}
    </Button>
  );
}

function EditCustomerSubmitButton() {
    const { pending } = useFormStatus();
    const { t } = useI18n();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t.customersPage.save_changes}
        </Button>
    );
}

function AddCustomerDialog({ isOpen, onOpenChange, onFormAction }: { isOpen: boolean, onOpenChange: (open: boolean) => void, onFormAction: (action: FormData) => void }) {
    const { t } = useI18n();
    const formRef = useRef<HTMLFormElement>(null);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.customersPage.add_customer_dialog_title}</DialogTitle>
                    <DialogDescription>{t.customersPage.add_customer_dialog_desc}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={onFormAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="add-name">{t.customersPage.form_name_label}</Label>
                        <Input id="add-name" name="name" placeholder={t.customersPage.form_name_placeholder} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-email">{t.customersPage.form_email_label}</Label>
                        <Input id="add-email" name="email" type="email" placeholder={t.customersPage.form_email_placeholder} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-subscriptionPlan">{t.customersPage.form_plan_label}</Label>
                        <Select name="subscriptionPlan" required>
                            <SelectTrigger id="add-subscriptionPlan"><SelectValue placeholder={t.customersPage.form_plan_placeholder} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="free">{t.customersPage.plan_free}</SelectItem>
                                <SelectItem value="starter">{t.customersPage.plan_starter}</SelectItem>
                                <SelectItem value="pro">{t.customersPage.plan_pro}</SelectItem>
                                <SelectItem value="enterprise">{t.customersPage.plan_enterprise}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>{t.customersPage.cancel}</Button>
                        <AddCustomerSubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditCustomerDialog({ customer, isOpen, onOpenChange }: { customer: Customer, isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    
    const initialState: UpdateCustomerState = { message: "", success: false, errors: {} };
    const [state, formAction] = useActionState(updateCustomer, initialState);

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? t.customersPage.toast_success_title : t.customersPage.toast_error_title,
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
            if (state.success) {
                onOpenChange(false);
            }
        }
    }, [state, toast, onOpenChange, t]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.customersPage.edit_customer_title}</DialogTitle>
                    <DialogDescription>{t.customersPage.edit_customer_desc}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <input type="hidden" name="id" value={customer.id} />
                    <div className="space-y-2">
                        <Label htmlFor="edit-name">{t.customersPage.form_name_label}</Label>
                        <Input id="edit-name" name="name" defaultValue={customer.name} required />
                        {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-email">{t.customersPage.form_email_label} (no editable)</Label>
                        <Input id="edit-email" type="email" defaultValue={customer.email} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-subscriptionPlan">{t.customersPage.form_plan_label}</Label>
                        <Select name="subscriptionPlan" defaultValue={customer.subscriptionPlan} required>
                            <SelectTrigger id="edit-subscriptionPlan"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="free">{t.customersPage.plan_free}</SelectItem>
                                <SelectItem value="starter">{t.customersPage.plan_starter}</SelectItem>
                                <SelectItem value="pro">{t.customersPage.plan_pro}</SelectItem>
                                <SelectItem value="enterprise">{t.customersPage.plan_enterprise}</SelectItem>
                            </SelectContent>
                        </Select>
                        {state.errors?.subscriptionPlan && <p className="text-sm font-medium text-destructive">{state.errors.subscriptionPlan[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-subscriptionStatus">{t.customersPage.col_status}</Label>
                        <Select name="subscriptionStatus" defaultValue={customer.subscriptionStatus} required>
                            <SelectTrigger id="edit-subscriptionStatus"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">{t.customersPage.status_active}</SelectItem>
                                <SelectItem value="inactive">{t.customersPage.status_inactive}</SelectItem>
                                <SelectItem value="cancelled">{t.customersPage.status_cancelled}</SelectItem>
                            </SelectContent>
                        </Select>
                        {state.errors?.subscriptionStatus && <p className="text-sm font-medium text-destructive">{state.errors.subscriptionStatus[0]}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>{t.customersPage.cancel}</Button>
                        <EditCustomerSubmitButton />
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
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
                    <DialogTitle>{t.customersPage.new_user_dialog_title}</DialogTitle>
                    <DialogDescription>{t.customersPage.new_user_dialog_desc}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 my-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>{t.customersPage.new_user_alert_title}</AlertTitle>
                        <AlertDescription>
                            {t.customersPage.new_user_alert_desc}
                        </AlertDescription>
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
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>{t.customersPage.close_button}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


// --- MAIN PAGE COMPONENT ---
export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: "ascending" | "descending"; }>({ key: "name", direction: "ascending" });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [newlyCreatedUser, setNewlyCreatedUser] = useState<NewUserInfo | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const initialState: AddCustomerState = { message: "", success: false, errors: {} };
  const [state, formAction] = useActionState(addCustomer, initialState);

   useEffect(() => {
    if (state.message) {
        toast({
            title: state.success ? t.customersPage.toast_success_title : t.customersPage.toast_error_title,
            description: state.message,
            variant: state.success ? "default" : "destructive",
        });
        if (state.success && state.newUser) {
            setIsAddDialogOpen(false);
            setNewlyCreatedUser(state.newUser);
        }
    }
  }, [state, t, toast]);


  useEffect(() => {
    if (!authLoading && user?.uid !== ADMIN_UID) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.uid !== ADMIN_UID) return;

    setLoading(true);
    const q = collection(db, "customers");
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const customersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching customers: ", error);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);
  
  const handleDeleteCustomer = () => {
    if (!customerToDelete) return;

    startDeleteTransition(async () => {
        const result = await deleteCustomer(customerToDelete.id);
        toast({
            title: result.success ? t.customersPage.toast_success_title : t.customersPage.toast_error_title,
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        setCustomerToDelete(null);
    });
  };

  const sortedAndFilteredCustomers = useMemo(() => {
    let filteredCustomers = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filteredCustomers.sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return filteredCustomers;
  }, [customers, searchTerm, sortConfig]);

  const handleSort = (key: keyof Customer) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
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

  const handleExportCSV = () => {
    const headers = [t.customersPage.col_name, t.customersPage.col_email, t.customersPage.col_did, t.customersPage.col_kms_key, t.customersPage.col_plan, t.customersPage.col_status];
    const csvContent = [
      headers.join(","),
      ...sortedAndFilteredCustomers.map(c => [
        `"${c.name}"`,
        c.email,
        c.did || '',
        c.kmsKeyPath || '',
        getPlanText(c.subscriptionPlan),
        getStatusText(c.subscriptionStatus)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `customers-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = sortedAndFilteredCustomers.map(c => [
        c.name,
        c.email,
        c.did || 'N/A',
        c.kmsKeyPath || 'N/A',
        getPlanText(c.subscriptionPlan),
        getStatusText(c.subscriptionStatus)
    ]);

    autoTable(doc, {
        head: [[t.customersPage.col_name, t.customersPage.col_email, t.customersPage.col_did, t.customersPage.col_kms_key, t.customersPage.col_plan, t.customersPage.col_status]],
        body: tableData,
        startY: 20,
        didDrawPage: (data) => {
            doc.text('Customer List', data.settings.margin.left, 15);
        }
    });

    doc.save(`customers-export-${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const SortableHeader = ({ sortKey, children }: { sortKey: keyof Customer, children: React.ReactNode }) => (
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return <Badge variant="secondary">{t.customersPage.status_active}</Badge>;
      case 'inactive': return <Badge variant="outline">{t.customersPage.status_inactive}</Badge>;
      case 'cancelled': return <Badge variant="destructive">{t.customersPage.status_cancelled}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getOnboardingStatusBadge = (status: Customer['onboardingStatus']) => {
    switch (status) {
      case 'completed': return <Badge variant="secondary" className="bg-green-100 text-green-800">{status}</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{status}</Badge>;
      case 'failed': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };


  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'free': return <Badge variant="outline">{t.customersPage.plan_free}</Badge>;
      case 'starter': return <Badge variant="secondary">{t.customersPage.plan_starter}</Badge>;
      case 'pro': return <Badge variant="default">{t.customersPage.plan_pro}</Badge>;
      case 'enterprise': return <Badge variant="default">{t.customersPage.plan_enterprise}</Badge>;
      default: return <Badge variant="outline">{plan}</Badge>;
    }
  }
  
  const truncateString = (str: string | undefined, num: number) => {
    if (!str) return '';
    if (str.length <= num) return str;
    return '...' + str.slice(str.length - num);
  }

  if (authLoading || user?.uid !== ADMIN_UID) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.customersPage.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.customersPage.list_title}</CardTitle>
            <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.customersPage.add_new_customer_button}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between pb-4 gap-2">
                <Input placeholder={t.customersPage.filter_placeholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t.customersPage.export_csv}
                    </Button>
                    <Button variant="outline" onClick={handleExportPDF}>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t.customersPage.export_pdf}
                    </Button>
                </div>
            </div>
          {loading ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader sortKey="name">{t.customersPage.col_name}</SortableHeader>
                  <SortableHeader sortKey="email">{t.customersPage.col_email}</SortableHeader>
                  <SortableHeader sortKey="apiKey">{t.customersPage.col_apiKey}</SortableHeader>
                  <SortableHeader sortKey="createdAt">{t.customersPage.col_createdAt}</SortableHeader>
                  <SortableHeader sortKey="renewalDate">{t.customersPage.col_renewalDate}</SortableHeader>
                  <SortableHeader sortKey="subscriptionPlan">{t.customersPage.col_plan}</SortableHeader>
                  <SortableHeader sortKey="onboardingStatus">{t.customersPage.col_onboarding_status}</SortableHeader>
                  <TableHead>{t.customersPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredCustomers.length > 0 && sortedAndFilteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="font-mono text-xs">
                       <Tooltip>
                        <TooltipTrigger asChild>
                           <span className="cursor-help">{truncateString(customer.apiKey, 20)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{customer.apiKey || 'N/A'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{customer.createdAt ? format(customer.createdAt.toDate(), 'P', { locale: locale === 'es' ? es : enUS }) : 'N/A'}</TableCell>
                    <TableCell>{customer.renewalDate ? format(customer.renewalDate.toDate(), 'P', { locale: locale === 'es' ? es : enUS }) : 'N/A'}</TableCell>
                    <TableCell>{getPlanBadge(customer.subscriptionPlan)}</TableCell>
                    <TableCell>{getOnboardingStatusBadge(customer.onboardingStatus)}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setCustomerToEdit(customer)}>
                                    <Pencil className="mr-2 h-4 w-4" /><span>{t.customersPage.edit}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCustomerToDelete(customer)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /><span>{t.customersPage.delete}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           { !loading && sortedAndFilteredCustomers.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-12 w-12" />
                <p className="mt-4">{customers.length > 0 && searchTerm ? t.customersPage.no_customers_filter : t.customersPage.no_customers}</p>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
    
    {/* --- DIALOGS --- */}
    <AddCustomerDialog 
        isOpen={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onFormAction={formAction}
    />

    {customerToEdit && (
        <EditCustomerDialog 
            customer={customerToEdit}
            isOpen={!!customerToEdit}
            onOpenChange={(open) => !open && setCustomerToEdit(null)}
        />
    )}

    {newlyCreatedUser && (
        <NewUserCredentialsDialog 
            userInfo={newlyCreatedUser}
            isOpen={!!newlyCreatedUser}
            onOpenChange={(open) => {
                if (!open) {
                    setNewlyCreatedUser(null);
                }
            }}
        />
    )}
    
    <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t.customersPage.delete_customer_title}</AlertDialogTitle>
                <AlertDialogDescription>{t.customersPage.delete_customer_desc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>{t.customersPage.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCustomer} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.customersPage.confirm}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}

    