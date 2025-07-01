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
      name,
      email,
      did: `did:bravium:${uid}`,
      subscriptionPlan,
      subscriptionStatus: 'active',
      kmsKeyPath: `projects/bravium/locations/global/keyRings/main/cryptoKeys/customer-${uid.substring(0,8)}`,
    };

    await adminDb.collection('customers').doc(uid).set(customerData);

    return { message: `Cliente "${name}" añadido correctamente.`, success: true };
  } catch (error: any) {
    return { message: `Error al crear el cliente: ${error.message}`, success: false };
  }
}
