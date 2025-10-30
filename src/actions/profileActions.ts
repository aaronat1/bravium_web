
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendPasswordResetEmail } from '@/lib/firebase/auth';
import { revalidatePath } from 'next/cache';
import { FieldValue } from 'firebase-admin/firestore';

// --- UPDATE PROFILE NAME ---
const UpdateNameSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
});

export type UpdateNameState = {
  message: string;
  errors?: {
    name?: string[];
  };
  success: boolean;
};

export async function updateProfileName(prevState: UpdateNameState, formData: FormData): Promise<UpdateNameState> {
  if (!adminAuth || !adminDb) {
    return {
      message: 'Error de configuración del servidor.',
      success: false,
    };
  }

  const userId = formData.get('userId') as string;
  if (!userId) {
    return { message: 'ID de usuario no encontrado.', success: false };
  }

  const validatedFields = UpdateNameSchema.safeParse({
    name: formData.get('name'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación.',
      success: false,
    };
  }

  const { name } = validatedFields.data;

  try {
    // Update both Firestore and Auth
    await adminDb.collection('customers').doc(userId).update({ name });
    await adminAuth.updateUser(userId, { displayName: name });
    
    revalidatePath('/profile');
    return { message: 'Nombre actualizado correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al actualizar el nombre: ${error.message}`, success: false };
  }
}

// --- UPDATE SUBSCRIPTION PLAN ---
export async function updateSubscriptionPlan(userId: string, newPlan: 'starter' | 'pro' | 'enterprise'): Promise<{ success: boolean, message: string }> {
  if (!adminDb) {
    return {
      message: 'Error de configuración del servidor.',
      success: false,
    };
  }
  
  if (!userId || !newPlan) {
    return { message: 'Faltan datos para actualizar el plan.', success: false };
  }

  try {
    const newRenewalDate = new Date();
    newRenewalDate.setDate(newRenewalDate.getDate() + 30);

    await adminDb.collection('customers').doc(userId).update({
      subscriptionPlan: newPlan,
      renewalDate: FieldValue.serverTimestamp(), // Firestore will set the server time
    });

    revalidatePath('/profile');
    return { message: 'Plan de suscripción actualizado correctamente. Tu nuevo ciclo de facturación ha comenzado.', success: true };
  } catch (error: any) {
    return { message: `Error al actualizar el plan: ${error.message}`, success: false };
  }
}


// --- SEND PASSWORD RESET EMAIL ---
export async function sendPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) {
        return { success: false, message: 'El correo electrónico es necesario.' };
    }
    const result = await sendPasswordResetEmail(email);
    if (result.success) {
        return { success: true, message: 'Correo de restablecimiento de contraseña enviado.' };
    } else {
        return { success: false, message: result.error?.message || 'Error desconocido.' };
    }
}


// --- DELETE OWN ACCOUNT ---
export async function deleteOwnAccount(userId: string): Promise<{ success: boolean; message: string }> {
  if (!adminAuth || !adminDb) {
    return {
      message: 'Error de configuración del servidor.',
      success: false,
    };
  }

  if (!userId) {
    return { message: 'ID de usuario no válido.', success: false };
  }
  
  try {
    // The onCustomerDelete Cloud Function will handle KMS key cleanup etc.
    await adminDb.collection('customers').doc(userId).delete();
    await adminAuth.deleteUser(userId);

    revalidatePath('/profile');
    return { message: 'Cuenta eliminada correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al eliminar la cuenta: ${error.message}`, success: false };
  }
}
