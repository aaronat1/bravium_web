
'use server';

import { z } from 'zod';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createHmac } from 'crypto';

const AddCustomerSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  email: z.string().email({ message: "El correo electrónico no es válido." }),
  subscriptionPlan: z.enum(['free', 'starter', 'pro', 'enterprise'], { errorMap: () => ({ message: 'Debe seleccionar un plan.'}) }).optional(),
});

export type AddCustomerState = {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    subscriptionPlan?: string[];
  };
  success: boolean;
  newUser?: {
    uid: string;
    email: string;
  };
};
/*
async function sendWelcomeEmail(email: string, password: string): Promise<void> {
  const API_URL = 'https://smtp.maileroo.com/send';
  const API_KEY = process.env.MAILEROO_API_KEY;
  const FROM_EMAIL = 'bravium@c819211b683530d3.maileroo.org';

  const subject = "Welcome to Bravium! / ¡Bienvenido a Bravium!";
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Welcome to Bravium!</h2>
        <p>Your account has been created successfully.</p>
        <p>Your password is: <strong>${password}</strong></p>
        <p>We strongly recommend changing it from your user profile inside the Bravium application.</p>
        <p>Sincerely,<br>The Bravium Team</p>
        <hr>
        <h2>¡Bienvenido a Bravium!</h2>
        <p>Tu cuenta ha sido creada con éxito.</p>
        <p>Tu contraseña es: <strong>${password}</strong></p>
        <p>Te recomendamos encarecidamente cambiarla desde tu perfil de usuario dentro de la aplicación de Bravium.</p>
        <p>Atentamente,<br>El equipo de Bravium</p>
    </div>
  `;

  const form = new FormData();
  form.append('from', FROM_EMAIL);
  form.append('to', email);
  form.append('subject', subject);
  form.append('html', htmlContent);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: form,
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(`Failed to send email: ${JSON.stringify(result)}`);
    }

    console.log(`Welcome email sent to ${email}`);
  } catch (error) {
    console.error("Could not send welcome email:", error);
    // We don't re-throw the error so that the customer creation process can complete even if the email fails.
  }
}
*/

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

  const { name, email } = validatedFields.data;
  const subscriptionPlan = validatedFields.data.subscriptionPlan || 'free';

  try {
    const existingUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existingUser) {
        return { message: "Ya existe un usuario con este correo electrónico.", success: false };
    }

    const userRecord = await adminAuth.createUser({
      email,
      emailVerified: false,
      displayName: name,
      disabled: false,
    });
    
    const { uid } = userRecord;

    await adminAuth.updateUser(uid, {
      password: uid,
    });

    const creationDate = new Date();
    const renewalDate = new Date(creationDate);
    renewalDate.setDate(creationDate.getDate() + 30);

    const secret = process.env.API_KEY_SECRET || 'default-secret';
    const apiKey = createHmac('sha256', secret).update(uid).digest('hex');

    const customerData = {
      id: uid,
      name,
      email,
      did: "",
      subscriptionPlan,
      subscriptionStatus: 'active',
      kmsKeyPath: "",
      onboardingStatus: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      renewalDate: renewalDate,
      apiKey: apiKey,
    };

    await adminDb.collection('customers').doc(uid).set(customerData);

    // Send welcome email after successful creation
    // await sendWelcomeEmail(email, uid);

    return { 
        message: `Cliente "${name}" añadido correctamente.`, 
        success: true,
        newUser: { uid, email },
    };
  } catch (error: any) {
    return { message: `Error al crear el cliente: ${error.message}`, success: false };
  }
}

// --- UPDATE CUSTOMER ---
const UpdateCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  subscriptionPlan: z.enum(['free', 'starter', 'pro', 'enterprise'], { errorMap: () => ({ message: 'Debe seleccionar un plan.'}) }),
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
  if (!adminDb || !adminAuth) {
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
    await adminAuth.updateUser(id, { displayName: name });
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
