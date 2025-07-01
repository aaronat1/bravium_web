'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { KeyManagementServiceClient } from '@google-cloud/kms';

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

    // Create a crypto key for the new customer in Google Cloud KMS
    const kmsClient = new KeyManagementServiceClient();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const keyRingId = 'main';
    const locationId = 'global';
    const cryptoKeyId = `customer-${uid.substring(0, 12)}`;
    
    const keyRingName = kmsClient.keyRingPath(projectId!, locationId, keyRingId);

    const [createdKey] = await kmsClient.createCryptoKey({
        parent: keyRingName,
        cryptoKeyId: cryptoKeyId,
        cryptoKey: {
            purpose: 'ENCRYPT_DECRYPT',
            versionTemplate: {
                algorithm: 'GOOGLE_SYMMETRIC_ENCRYPTION',
                protectionLevel: 'SOFTWARE',
            },
        },
    });

    if (!createdKey.name) {
        throw new Error('No se pudo crear la clave KMS para el cliente.');
    }

    const customerData = {
      name,
      email,
      did: `did:bravium:${uid}`,
      subscriptionPlan,
      subscriptionStatus: 'active',
      kmsKeyPath: createdKey.name,
    };

    await adminDb.collection('customers').doc(uid).set(customerData);

    return { message: `Cliente "${name}" añadido correctamente.`, success: true };
  } catch (error: any) {
    // Provide more specific error messages for KMS issues
    if (error.code === 7) { // gRPC code for PERMISSION_DENIED
        return { message: `Error de permisos de KMS: La cuenta de servicio no tiene permiso para crear claves. Asegúrate de que tenga el rol "Administrador de Cloud KMS".`, success: false };
    }
    if (error.code === 5) { // gRPC code for NOT_FOUND
        return { message: `Error de KMS: No se encontró el llavero de claves '${process.env.KMS_KEY_RING_ID || 'main'}'. Por favor, créalo en Google Cloud.`, success: false };
    }
    return { message: `Error al crear el cliente: ${error.message}`, success: false };
  }
}
