
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

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

// --- DELETE ISSUED CREDENTIAL ---
export async function deleteIssuedCredential(credentialId: string): Promise<{ success: boolean; message: string }> {
  if (!adminDb) {
    return { message: 'Server configuration error.', success: false };
  }

  if (!credentialId) {
    return { message: 'Invalid credential ID.', success: false };
  }

  try {
    await adminDb.collection('issuedCredentials').doc(credentialId).delete();
    revalidatePath('/credentials');
    return { message: 'Credential record deleted successfully.', success: true };
  } catch (error: any) {
    return { message: `Error deleting credential record: ${error.message}`, success: false };
  }
}
