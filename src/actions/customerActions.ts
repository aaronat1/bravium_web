
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const AddCustomerSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  email: z.string().email({ message: "El correo electrónico no es válido." }),
  subscriptionPlan: z.enum(['starter', 'pro', 'enterprise'], { errorMap: () => ({ message: 'Debe seleccionar un plan.'}) }),
});

export type AddCustomerState = {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    subscriptionPlan?: string[];
  };
  success: boolean;
};

export async function addCustomer(prevState: AddCustomerState, formData: FormData): Promise<AddCustomerState> {
  if (!adminAuth || !adminDb) {
    return {
      message: 'Error de configuración: Las funcionalidades de administrador no están disponibles. Revisa las credenciales del SDK de Firebase Admin en el servidor.',
      success: false,
    };
  }

  const validatedFields = AddCustomerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subscriptionPlan: formData.get('subscriptionPlan'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, corrija los campos.',
      success: false,
    };
  }

  const { name, email, subscriptionPlan } = validatedFields.data;

  try {
    const existingUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
        return { message: "Ya existe un usuario con este correo electrónico.", success: false };
    }

    // A random password is required for creation, but will be updated.
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const userRecord = await adminAuth.createUser({
      email,
      emailVerified: false,
      password: tempPassword,
      displayName: name,
      disabled: false,
    });
    
    const { uid } = userRecord;

    // As requested, update the password to be the UID.
    // NOTE: This is not a recommended security practice.
    await adminAuth.updateUser(uid, {
      password: uid,
    });

    const customerData = {
      id: uid,
      name,
      email,
      did: "",
      subscriptionPlan,
      subscriptionStatus: 'active',
      kmsKeyPath: "",
    };

    await adminDb.collection('customers').doc(uid).set(customerData);

    return { message: `Cliente "${name}" añadido correctamente.`, success: true };
  } catch (error: any) {
    return { message: `Error al crear el cliente: ${error.message}`, success: false };
  }
}

// --- UPDATE CUSTOMER ---
const UpdateCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  subscriptionPlan: z.enum(['starter', 'pro', 'enterprise'], { errorMap: () => ({ message: 'Debe seleccionar un plan.'}) }),
  subscriptionStatus: z.enum(['active', 'inactive', 'cancelled'], { errorMap: () => ({ message: 'Debe seleccionar un estado.'}) }),
});

export type UpdateCustomerState = {
  message: string;
  errors?: {
    name?: string[];
    subscriptionPlan?: string[];
    subscriptionStatus?: string[];
  };
  success: boolean;
};

export async function updateCustomer(prevState: UpdateCustomerState, formData: FormData): Promise<UpdateCustomerState> {
  if (!adminDb) {
    return {
      message: 'Error de configuración: Las funcionalidades de administrador no están disponibles.',
      success: false,
    };
  }
  
  const validatedFields = UpdateCustomerSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    subscriptionPlan: formData.get('subscriptionPlan'),
    subscriptionStatus: formData.get('subscriptionStatus'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, corrija los campos.',
      success: false,
    };
  }

  const { id, name, subscriptionPlan, subscriptionStatus } = validatedFields.data;

  try {
    await adminDb.collection('customers').doc(id).update({
      name,
      subscriptionPlan,
      subscriptionStatus,
    });
    // Also update the display name in Firebase Auth
    if (adminAuth) {
        await adminAuth.updateUser(id, { displayName: name });
    }
    return { message: 'Cliente actualizado correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al actualizar el cliente: ${error.message}`, success: false };
  }
}


// --- DELETE CUSTOMER ---
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; message: string }> {
  if (!adminAuth || !adminDb) {
    return {
      message: 'Error de configuración: Las funcionalidades de administrador no están disponibles.',
      success: false,
    };
  }

  if (!customerId) {
    return { message: 'ID de cliente no válido.', success: false };
  }

  try {
    // KMS key destruction will be handled by a Cloud Function trigger on customer deletion.
    
    // Delete Firestore document
    await adminDb.collection('customers').doc(customerId).delete();

    // Delete Auth user
    await adminAuth.deleteUser(customerId);

    return { message: 'Cliente eliminado correctamente.', success: true };
  } catch (error: any) {
    return { message: `Error al eliminar el cliente: ${error.message}`, success: false };
  }
}
