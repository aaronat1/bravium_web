
"use client";

import { useEffect, useState, useRef, useActionState, useMemo, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { Users, PlusCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Pencil, Trash2, FileDown } from "lucide-react";

import { db } from "@/lib/firebase/config";
import { addCustomer, type AddCustomerState, deleteCustomer, updateCustomer, type UpdateCustomerState } from "@/actions/customerActions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Customer = {
  id: string;
  name: string;
  email: string;
  did: string;
  subscriptionPlan: 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  kmsKeyPath: string;
};

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

function AddCustomerDialog({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);

    const initialState: AddCustomerState = { message: "", success: false, errors: {} };
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
                onOpenChange(false);
            }
        }
    }, [state, toast, onOpenChange, t]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t.customersPage.add_customer_dialog_title}</DialogTitle>
                    <DialogDescription>{t.customersPage.add_customer_dialog_desc}</DialogDescription>
                </DialogHeader>
                <form ref={formRef} action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="add-name">{t.customersPage.form_name_label}</Label>
                        <Input id="add-name" name="name" placeholder={t.customersPage.form_name_placeholder} required />
                        {state.errors?.name && <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-email">{t.customersPage.form_email_label}</Label>
                        <Input id="add-email" name="email" type="email" placeholder={t.customersPage.form_email_placeholder} required />
                        {state.errors?.email && <p className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="add-subscriptionPlan">{t.customersPage.form_plan_label}</Label>
                        <Select name="subscriptionPlan" required>
                            <SelectTrigger id="add-subscriptionPlan"><SelectValue placeholder={t.customersPage.form_plan_placeholder} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="starter">{t.customersPage.plan_starter}</SelectItem>
                                <SelectItem value="pro">{t.customersPage.plan_pro}</SelectItem>
                                <SelectItem value="enterprise">{t.customersPage.plan_enterprise}</SelectItem>
                            </SelectContent>
                        </Select>
                        {state.errors?.subscriptionPlan && <p className="text-sm font-medium text-destructive">{state.errors.subscriptionPlan[0]}</p>}
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

// --- MAIN PAGE COMPONENT ---
export default function CustomersPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Customer; direction: "ascending" | "descending"; }>({ key: "name", direction: "ascending" });
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
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
  }, []);
  
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
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
      return 0;
    });
    return filteredCustomers;
  }, [customers, searchTerm, sortConfig]);

  const handleSort = (key: keyof Customer) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending' }));
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

  const getPlanBadge = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'starter': return <Badge variant="secondary">{t.customersPage.plan_starter}</Badge>;
      case 'pro': return <Badge variant="default">{t.customersPage.plan_pro}</Badge>;
      case 'enterprise': return <Badge variant="default">{t.customersPage.plan_enterprise}</Badge>;
      default: return <Badge variant="outline">{plan}</Badge>;
    }
  }

  return (
    <>
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
                    <Button variant="outline" disabled>
                        <FileDown className="mr-2 h-4 w-4" />
                        {t.customersPage.export_csv}
                    </Button>
                    <Button variant="outline" disabled>
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
                  <SortableHeader sortKey="did">{t.customersPage.col_did}</SortableHeader>
                  <SortableHeader sortKey="kmsKeyPath">{t.customersPage.col_kms_key}</SortableHeader>
                  <SortableHeader sortKey="subscriptionPlan">{t.customersPage.col_plan}</SortableHeader>
                  <SortableHeader sortKey="subscriptionStatus">{t.customersPage.col_status}</SortableHeader>
                  <TableHead>{t.customersPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAndFilteredCustomers.length > 0 && sortedAndFilteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell className="font-mono text-xs">{customer.did}</TableCell>
                    <TableCell>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild>
                            <span className="font-mono text-xs block max-w-[150px] truncate cursor-help">{customer.kmsKeyPath}</span>
                        </TooltipTrigger><TooltipContent><p className="font-mono text-xs">{customer.kmsKeyPath}</p></TooltipContent></Tooltip></TooltipProvider>
                    </TableCell>
                    <TableCell>{getPlanBadge(customer.subscriptionPlan)}</TableCell>
                    <TableCell>{getStatusBadge(customer.subscriptionStatus)}</TableCell>
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
    <AddCustomerDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />

    {customerToEdit && (
        <EditCustomerDialog 
            customer={customerToEdit}
            isOpen={!!customerToEdit}
            onOpenChange={(open) => !open && setCustomerToEdit(null)}
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
    </>
  );
}
