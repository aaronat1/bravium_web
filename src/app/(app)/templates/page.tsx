
"use client";

import { useEffect, useState, useRef, useActionState, useMemo, useTransition } from "react";
import { useForm, useFieldArray, useFormContext, Controller } from "react-hook-form";
import { useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { PlusCircle, Loader2, MoreHorizontal, Pencil, Trash2, Users, ClipboardList, GripVertical, Sparkles, FileText, Calendar, ToyBrick, Type, Trash, File } from "lucide-react";

import { db } from "@/lib/firebase/config";
import { createTemplate, updateTemplate, deleteTemplate, generateTemplateSchema } from "@/actions/templateActions";
import type { TemplateState } from "@/actions/templateActions";
import { useAuth } from "@/hooks/use-auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/hooks/use-i18n";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";


const ADMIN_UID = "PdaXG6zsMbaoQNRgUr136DvKWtM2";

// DATA TYPES
export type TemplateField = {
  id?: string;
  fieldName: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'file';
  required: boolean;
  options?: string[];
  defaultValue?: string;
};

export type CredentialTemplate = {
  id: string;
  name: string;
  description?: string;
  fields: TemplateField[];
  customerId: string;
};

// ZOD SCHEMA
const fieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required").regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(['text', 'date', 'select', 'file']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
});

type TemplateFormData = z.infer<ReturnType<typeof useTemplateFormSchema>>;

function useTemplateFormSchema() {
    const { t } = useI18n();
    return z.object({
        name: z.string().min(1, t.templatesPage.form_validation_name),
        description: z.string().optional(),
        fields: z.array(fieldSchema).min(1, t.templatesPage.form_validation_fields),
        customerId: z.string().min(1, t.templatesPage.form_validation_customer),
    });
}

// DIALOGS & FORMS
function TemplateFormDialog({ isOpen, onOpenChange, template, customers }: { isOpen: boolean, onOpenChange: (open: boolean) => void, template?: CredentialTemplate | null, customers: {id: string; name: string}[] }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState("designer");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, startGeneratingTransition] = useTransition();

  const isEditMode = !!template;
  const isAdmin = user?.uid === ADMIN_UID;
  const templateFormSchema = useTemplateFormSchema();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: isEditMode && template ? {
      name: template.name,
      description: template.description || "",
      fields: template.fields.map(f => ({ ...f, fieldName: f.fieldName.replace(/[^a-zA-Z0-9_]/g, '') })),
      customerId: template.customerId,
    } : {
      name: "",
      description: "",
      fields: [{ fieldName: "recipientName", label: "Recipient Name", type: "text", required: true, options: [], defaultValue: "" }],
      customerId: isAdmin ? "" : user?.uid || "",
    }
  });

  const { control, handleSubmit, reset, watch } = form;
  const { fields, append, remove, move } = useFieldArray({ control, name: "fields" });
  
  const watchedFields = watch("fields");

  const initialState: TemplateState = { message: "", success: false, errors: {} };
  const [state, formAction] = useActionState(isEditMode ? updateTemplate : createTemplate, initialState);

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? t.toast_success_title : t.toast_error_title,
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
      if (state.success) {
        onOpenChange(false);
      }
    }
  }, [state, toast, onOpenChange, t]);
  
  useEffect(() => {
     if (isOpen) {
        const defaultCustomerId = isAdmin ? "" : user?.uid || "";
        reset(isEditMode && template ? {
          name: template.name,
          description: template.description || "",
          fields: template.fields,
          customerId: template.customerId,
        } : {
          name: "",
          description: "",
          fields: [{ fieldName: "recipientName", label: "Recipient Name", type: "text", required: true }],
          customerId: defaultCustomerId,
        });
        setActiveTab("designer");
        setAiPrompt("");
     }
  }, [isOpen, template, isEditMode, reset, isAdmin, user])

  const handleGenerate = async () => {
    if (!aiPrompt) return;
    startGeneratingTransition(async () => {
        const result = await generateTemplateSchema(aiPrompt);
        if (result.success && result.data) {
            reset({ ...form.getValues(), ...result.data });
            toast({ title: t.templatesPage.ai_success_title, description: t.templatesPage.ai_success_desc });
            setActiveTab("designer");
        } else {
            toast({ variant: "destructive", title: t.toast_error_title, description: result.message });
        }
    });
  };

  const submitButton = () => {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? t.templatesPage.form_save : t.templatesPage.form_create}
        </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditMode ? t.templatesPage.edit_title : t.templatesPage.create_title}</DialogTitle>
          <DialogDescription>{isEditMode ? t.templatesPage.edit_desc : t.templatesPage.create_desc}</DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="designer">{t.templatesPage.tab_designer}</TabsTrigger>
            <TabsTrigger value="ai">{t.templatesPage.tab_ai}</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form action={formAction} className="flex-grow flex flex-col min-h-0">
            {isEditMode && <input type="hidden" name="templateId" value={template.id} />}

            <TabsContent value="designer" className="flex-grow space-y-4 overflow-y-auto p-1 pr-4">
                <FormField control={control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t.templatesPage.form_name_label}</FormLabel>
                        <FormControl><Input placeholder={t.templatesPage.form_name_placeholder} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={control} name="description" render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t.templatesPage.form_desc_label}</FormLabel>
                        <FormControl><Textarea placeholder={t.templatesPage.form_desc_placeholder} {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                {isAdmin && (
                  <FormField
                      control={control}
                      name="customerId"
                      render={({ field }) => (
                          <FormItem>
                              <FormLabel>{t.templatesPage.form_customer_label}</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                      <SelectTrigger>
                                          <SelectValue placeholder={t.templatesPage.form_customer_placeholder} />
                                      </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {customers.map(customer => (
                                          <SelectItem key={customer.id} value={customer.id}>
                                              {customer.name}
                                          </SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                )}


                <div className="space-y-4">
                    <Label>{t.templatesPage.fields_label}</Label>
                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 space-y-3 bg-muted/50">
                             <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{t.templatesPage.field_title} #{index + 1}</h4>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash className="h-4 w-4" /></Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={control} name={`fields.${index}.label`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.templatesPage.field_label}</FormLabel>
                                        <FormControl><Input placeholder="e.g., Course Name" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={control} name={`fields.${index}.fieldName`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.templatesPage.field_id}</FormLabel>
                                        <FormControl><Input placeholder="e.g., courseName" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={control} name={`fields.${index}.type`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.templatesPage.field_type}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="text"><Type className="mr-2 h-4 w-4 inline-block"/>{t.templatesPage.type_text}</SelectItem>
                                                <SelectItem value="date"><Calendar className="mr-2 h-4 w-4 inline-block"/>{t.templatesPage.type_date}</SelectItem>
                                                <SelectItem value="select"><ToyBrick className="mr-2 h-4 w-4 inline-block"/>{t.templatesPage.type_select}</SelectItem>
                                                <SelectItem value="file"><File className="mr-2 h-4 w-4 inline-block"/>{t.templatesPage.type_file}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={control} name={`fields.${index}.required`} render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2">
                                        <FormLabel>{t.templatesPage.field_required}</FormLabel>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                            {watchedFields[index].type === 'select' && (
                                <FormField control={control} name={`fields.${index}.options`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.templatesPage.field_options}</FormLabel>
                                        <FormControl><Input placeholder="Option 1, Option 2, ..." {...field} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()))} value={Array.isArray(field.value) ? field.value.join(', ') : ''} /></FormControl>
                                        <FormDescription>{t.templatesPage.field_options_desc}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </Card>
                    ))}
                    <Button type="button" variant="outline" onClick={() => append({ fieldName: `field_${fields.length + 1}`, label: "New Field", type: "text", required: false })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t.templatesPage.add_field_button}
                    </Button>
                </div>
            </TabsContent>

            <TabsContent value="ai" className="flex-grow flex flex-col space-y-4">
              <div className="p-4 border-l-4 border-accent bg-accent/20">
                <h4 className="font-semibold">{t.templatesPage.ai_tip_title}</h4>
                <p className="text-sm text-muted-foreground">{t.templatesPage.ai_tip_desc}</p>
              </div>
              <Textarea 
                placeholder={t.templatesPage.ai_placeholder}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-grow text-base"
                rows={10}
              />
              <div className="flex justify-end">
                <Button type="button" onClick={handleGenerate} disabled={isGenerating || !aiPrompt}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}
                    {t.templatesPage.ai_generate_button}
                </Button>
              </div>
            </TabsContent>
            
            <DialogFooter className="mt-4 pt-4 border-t">
              <input type="hidden" {...form.register('form_data_json')} />
              <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>{t.templatesPage.cancel}</Button>
              <Button type="submit" disabled={useFormStatus().pending} onClick={handleSubmit((data) => {
                  const templateData = new FormData();
                  if (isEditMode) {
                    templateData.append('templateId', template.id);
                  }
                  templateData.append('templateData', JSON.stringify(data));
                  formAction(templateData);
              })}>
                {useFormStatus().pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEditMode ? t.templatesPage.form_save : t.templatesPage.form_create}
            </Button>
            </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


// MAIN PAGE COMPONENT
export default function TemplatesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<CredentialTemplate[]>([]);
  const [customers, setCustomers] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<CredentialTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<CredentialTemplate | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isAdmin = user?.uid === ADMIN_UID;

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const templatesCollection = collection(db, "credentialSchemas");
    const templatesQuery = isAdmin ? templatesCollection : query(templatesCollection, where("customerId", "==", user.uid));
    
    const unsubscribeTemplates = onSnapshot(templatesQuery, (querySnapshot) => {
      const templatesData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CredentialTemplate));
      setTemplates(templatesData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching templates: ", error);
        toast({ variant: "destructive", title: t.toast_error_title, description: "Failed to load templates." });
        setLoading(false);
    });

    let unsubscribeCustomers = () => {};
    if (isAdmin) {
      const custQ = collection(db, "customers");
      unsubscribeCustomers = onSnapshot(custQ, (querySnapshot) => {
          setCustomers(querySnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string })));
      });
    }

    return () => {
        unsubscribeTemplates();
        unsubscribeCustomers();
    };
  }, [t, toast, user, isAdmin]);

  const customerMap = useMemo(() => {
    return customers.reduce((acc, customer) => {
        acc[customer.id] = customer.name;
        return acc;
    }, {} as Record<string, string>);
  }, [customers]);
  
  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;

    startDeleteTransition(async () => {
        const result = await deleteTemplate(templateToDelete.id);
        toast({
            title: result.success ? t.toast_success_title : t.toast_error_title,
            description: result.message,
            variant: result.success ? "default" : "destructive",
        });
        setTemplateToDelete(null);
    });
  };

  const handleCreateNew = () => {
    setTemplateToEdit(null);
    setIsFormOpen(true);
  }

  const handleEdit = (template: CredentialTemplate) => {
    setTemplateToEdit(template);
    setIsFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t.templatesPage.title}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t.templatesPage.list_title}</CardTitle>
            <Button onClick={handleCreateNew}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t.templatesPage.add_new_button}
            </Button>
          </div>
          <CardDescription>{t.templatesPage.list_desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.templatesPage.col_name}</TableHead>
                  <TableHead>{t.templatesPage.col_desc}</TableHead>
                  {isAdmin && <TableHead>{t.templatesPage.col_customer}</TableHead>}
                  <TableHead className="text-center">{t.templatesPage.col_fields}</TableHead>
                  <TableHead>{t.templatesPage.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="text-muted-foreground">{template.description}</TableCell>
                    {isAdmin && <TableCell>{customerMap[template.customerId] || template.customerId}</TableCell>}
                    <TableCell className="text-center">{template.fields?.length || 0}</TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(template)}>
                                    <Pencil className="mr-2 h-4 w-4" /><span>{t.templatesPage.edit}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTemplateToDelete(template)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                    <Trash2 className="mr-2 h-4 w-4" /><span>{t.templatesPage.delete}</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
           { !loading && templates.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <ClipboardList className="mx-auto h-12 w-12" />
                <p className="mt-4">{t.templatesPage.no_templates}</p>
              </div>
            )}
        </CardContent>
      </Card>
      
      <TemplateFormDialog 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        template={templateToEdit} 
        customers={customers}
      />

      <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{t.templatesPage.delete_dialog_title}</AlertDialogTitle>
                  <AlertDialogDescription>{t.templatesPage.delete_dialog_desc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>{t.templatesPage.cancel}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTemplate} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t.templatesPage.confirm}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
