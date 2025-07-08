
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!adminDb) {
  console.warn("Firebase Admin DB is not initialized. Issuance actions will fail.");
}

const IssuedCredentialSchema = z.object({
  templateId: z.string(),
  templateName: z.string(),
  customerId: z.string(),
  recipientData: z.record(z.any()),
  jws: z.string(),
});

export async function saveIssuedCredential(data: z.infer<typeof IssuedCredentialSchema>) {
    if (!adminDb) {
        return { success: false, message: 'Server configuration error.' };
    }

    const validatedFields = IssuedCredentialSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: 'Invalid data.' };
    }
    
    try {
        await adminDb.collection('issuedCredentials').add({
            ...validatedFields.data,
            issuedAt: FieldValue.serverTimestamp(),
        });
        return { success: true, message: 'Credential issuance recorded.' };
    } catch (error: any) {
        return { success: false, message: `Failed to record credential: ${error.message}` };
    }
}
