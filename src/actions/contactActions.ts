
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const ContactSchema = z.object({
  name: z.string().min(1, { message: "El nombre es obligatorio." }),
  email: z.string().email({ message: "El correo electrónico no es válido." }),
  subject: z.string().min(1, { message: "El asunto es obligatorio." }),
  message: z.string().min(10, { message: "El mensaje debe tener al menos 10 caracteres." }),
});

export type ContactFormState = {
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    subject?: string[];
    message?: string[];
  };
  success: boolean;
};
async function sendContactEmail(data: z.infer<typeof ContactSchema>): Promise<{ success: boolean }> {
  const API_URL = 'https://smtp.maileroo.com/send';
  const API_KEY = process.env.MAILEROO_API_KEY;
  const FROM_EMAIL = 'bravium@c819211b683530d3.maileroo.org';
  const TO_EMAIL = 'aaron.asencio.tavio@gmail.com';

  if (!API_KEY) {
    console.error("Maileroo API Key is not configured.");
    return { success: false };
  }

  const subject = `Nuevo Mensaje de Contacto: ${data.subject}`;
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Nuevo Mensaje del Formulario de Contacto</h2>
        <p>Has recibido un nuevo mensaje a través de la web de Bravium.</p>
        <hr>
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Asunto:</strong> ${data.subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="padding: 10px; border-left: 3px solid #eee;">${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
    </div>
  `;

  const form = new FormData();
  form.append('from', FROM_EMAIL);
  form.append('to', TO_EMAIL);
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
      console.error(`Failed to send contact email: ${JSON.stringify(result)}`);
      return { success: false };
    } else {
      console.log(`Contact form email sent successfully to ${TO_EMAIL}`);
      return { success: true };
    }
  } catch (error) {
    console.error("Could not send contact email:", error);
    return { success: false };
  }
}
export async function sendContactMessage(prevState: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const validatedFields = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error de validación. Por favor, corrija los campos.',
      success: false,
    };
  }

  if (adminDb) {
    try {
      await adminDb.collection('contacts').add({
        ...validatedFields.data,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (dbError: any) {
      console.error(`Error saving contact message to Firestore: ${dbError.message}`);
      return {
        message: `No se pudo guardar el mensaje en la base de datos: ${dbError.message}`,
        success: false,
      }
    }
  } else {
    console.warn('WARNING: Firebase Admin DB is not initialized. Contact message will not be saved to the database.');
  }

  const emailResult = await sendContactEmail(validatedFields.data);

  if (!emailResult.success) {
    return {
      message: 'El mensaje se guardó, pero no se pudo enviar el correo de notificación.',
      success: false,
    }
  }

  return { message: 'Mensaje enviado correctamente.', success: true };
}
