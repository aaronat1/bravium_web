
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getFunctions } from 'firebase-admin/functions';


const DEMO_CUSTOMER_ID = "d31KJFgu5KR6jOXYQ0h5h8VXyuW2";


const IssuedCredentialSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  customerId: z.string(),
  recipientData: z.record(z.any()),
  jws: z.string(),
  test: z.boolean().optional(),
  emailTester: z.string().email().optional(),
});

export async function saveIssuedCredential(data: z.infer<typeof IssuedCredentialSchema>): Promise<{ success: boolean; message: string, id?: string }> {
    if (!adminDb) {
        return { success: false, message: 'Server configuration error.' };
    }

    const validatedFields = IssuedCredentialSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }
    
    try {
        const docRef = await adminDb.collection('issuedCredentials').add({
            ...validatedFields.data,
            issuedAt: FieldValue.serverTimestamp(),
        });
        revalidatePath('/credentials');
        return { success: true, message: 'Credential issuance recorded.', id: docRef.id };
    } catch (error: any) {
        return { success: false, message: `Failed to record credential: ${error.message}` };
    }
}


export async function issueDemoCredential(
    credentialSubject: Record<string, any>,
    templateName: string,
    templateId: string,
    email: string
): Promise<{ success: boolean; jws?: string; id?: string; message: string }> {
    if (!adminDb) {
        return { success: false, message: 'Server configuration error: Admin DB not available.' };
    }

    // 1. Obtener la IP del visitante
    const forwarded = headers().get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(/, /)[0] : headers().get('x-real-ip');

    if (!ip) {
        return { success: false, message: "Could not determine visitor's IP address." };
    }
    
    const rateLimitRef = adminDb.collection('testIssuanceRateLimits').doc(ip);
    
    try {
        const rateLimitDoc = await rateLimitRef.get();
        if (rateLimitDoc.exists) {
            const lastIssuance = rateLimitDoc.data()?.timestamp.toDate();
            const now = new Date();
            const twentyFourHours = 24 * 60 * 60 * 1000;
            if (now.getTime() - lastIssuance.getTime() < twentyFourHours) {
                return { success: false, message: 'You can only issue one demo credential every 24 hours from the same IP address.'};
            }
        }
        
        // AQUÍ SE LLAMA A LA CLOUD FUNCTION `issueCredential` DESDE EL SERVIDOR DE NEXT.JS
        // Se le pasa un objeto con la siguiente información:
        // - credentialSubject: Un objeto con los datos del formulario (ej: { studentName: 'Jane Doe', ... })
        // - credentialType: El nombre de la plantilla (ej: "Certificado de Participación")
        // - customerId: El ID del cliente de demostración.
        // - test: true, para marcar que es una prueba.
        // - emailTester: el email del usuario de la demo.
        const issueCredentialFunc = getFunctions().httpsCallable('issueCredential');
        const result = await issueCredentialFunc({
            credentialSubject: credentialSubject,
            credentialType: templateName,
            customerId: DEMO_CUSTOMER_ID,
            test: true,
            emailTester: email
        });

        const jws = (result.data as any).verifiableCredentialJws;
        if (!jws) {
            throw new Error("Cloud function did not return a verifiableCredentialJws.");
        }
        
        // 3. Guardar el registro de la credencial emitida (incluyendo la actualización del timestamp del rate limit)
        await rateLimitRef.set({ timestamp: FieldValue.serverTimestamp() });

        const savedCredential = await saveIssuedCredential({
            templateId: templateId,
            templateName: templateName,
            customerId: DEMO_CUSTOMER_ID,
            recipientData: credentialSubject,
            jws,
            test: true,
            emailTester: email,
        });

        if (!savedCredential.success || !savedCredential.id) {
            throw new Error(savedCredential.message || "Failed to save demo credential record.");
        }

        return { success: true, jws, id: savedCredential.id, message: "Credential issued successfully." };

    } catch (error: any) {
        console.error("Error in issueDemoCredential:", error);
        
        // Extraer el mensaje de error de la Cloud Function si está disponible
        const functionErrorMessage = error.details?.message || error.message;

        return { success: false, message: functionErrorMessage || "An unexpected error occurred during demo issuance." };
    }
}
