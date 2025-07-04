
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { generateTemplate } from '@/ai/flows/generate-template-flow';
import type { GenerateTemplateOutput } from '@/ai/flows/generate-template-flow';
import { revalidatePath } from 'next/cache';

const templatesCollection = adminDb?.collection('credential_templates');

if (!adminDb) {
  console.warn("Firebase Admin DB is not initialized. Template actions will fail.");
}

// Zod Schema for validation from the client
const FieldSchema = z.object({
  fieldName: z.string().min(1, "Field name is required").regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores allowed"),
  label: z.string().min(1, "Label is required"),
  type: z.enum(['text', 'date', 'select', 'file']),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
});

const TemplateSchema = z.object({
  name: z.string().min(1, "Template name is required."),
  description: z.string().optional(),
  fields: z.array(FieldSchema).min(1, "At least one field is required."),
});

export type TemplateState = {
  message: string;
  errors?: z.ZodError<typeof TemplateSchema>['formErrors']['fieldErrors'];
  success: boolean;
};

// --- CREATE TEMPLATE ---
export async function createTemplate(prevState: TemplateState, formData: FormData): Promise<TemplateState> {
  if (!templatesCollection) {
    return {
      message: 'Error de configuración del servidor: la base de datos no está disponible.',
      success: false,
    };
  }

  const formDataJson = formData.get('templateData');
  if (typeof formDataJson !== 'string') {
    return { message: 'Datos de formulario no válidos.', success: false };
  }
  
  const parsedData = JSON.parse(formDataJson);
  const validatedFields = TemplateSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, corrija los campos.',
      success: false,
    };
  }

  try {
    await templatesCollection.add(validatedFields.data);
    revalidatePath('/templates');
    return { message: 'Plantilla creada correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al crear la plantilla: ${error.message}`, success: false };
  }
}

// --- UPDATE TEMPLATE ---
export async function updateTemplate(prevState: TemplateState, formData: FormData): Promise<TemplateState> {
    if (!templatesCollection) {
        return { message: 'Error de configuración del servidor.', success: false };
    }

    const templateId = formData.get('templateId');
    const formDataJson = formData.get('templateData');

    if (typeof templateId !== 'string' || !templateId) {
        return { message: 'ID de plantilla no válido.', success: false };
    }
     if (typeof formDataJson !== 'string') {
        return { message: 'Datos de formulario no válidos.', success: false };
    }

    const parsedData = JSON.parse(formDataJson);
    const validatedFields = TemplateSchema.safeParse(parsedData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Error de validación. Por favor, corrija los campos.',
            success: false,
        };
    }

    try {
        await templatesCollection.doc(templateId).set(validatedFields.data, { merge: true });
        revalidatePath('/templates');
        return { message: 'Plantilla actualizada correctamente.', success: true };
    } catch (error: any) {
        return { message: `Error al actualizar la plantilla: ${error.message}`, success: false };
    }
}

// --- DELETE TEMPLATE ---
export async function deleteTemplate(templateId: string): Promise<{ success: boolean; message: string }> {
  if (!templatesCollection) {
    return { message: 'Error de configuración del servidor.', success: false };
  }

  if (!templateId) {
    return { message: 'ID de plantilla no válido.', success: false };
  }

  try {
    await templatesCollection.doc(templateId).delete();
    revalidatePath('/templates');
    return { message: 'Plantilla eliminada correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al eliminar la plantilla: ${error.message}`, success: false };
  }
}

// --- AI SCHEMA GENERATION ---
export async function generateTemplateSchema(prompt: string): Promise<{ success: boolean; data?: GenerateTemplateOutput; message?: string }> {
  if (!prompt) {
    return { success: false, message: 'El prompt no puede estar vacío.' };
  }
  
  try {
    const result = await generateTemplate({ prompt });
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error generating schema from AI:", error);
    return { success: false, message: `Error de la IA: ${error.message}` };
  }
}
