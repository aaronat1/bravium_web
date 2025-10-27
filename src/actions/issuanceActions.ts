
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import * as jose from 'jose';

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

  const issuedCredentialRef = adminDb.collection('issuedCredentials').doc(credentialId);

  try {
    const docSnapshot = await issuedCredentialRef.get();
    if (!docSnapshot.exists) {
      throw new Error("Credential record not found.");
    }
    
    const credentialData = docSnapshot.data();
    const jws = credentialData?.jws;

    const batch = adminDb.batch();

    // 1. Delete the issued credential record
    batch.delete(issuedCredentialRef);

    // 2. If there's a JWS, decode it to find the associated DID and delete it.
    if (jws) {
        try {
            const decodedHeader = jose.decodeProtectedHeader(jws);
            if (decodedHeader.kid && typeof decodedHeader.kid === 'string') {
                const did = decodedHeader.kid.split('#')[0];
                const didRef = adminDb.collection('dids').doc(did);
                batch.delete(didRef);
            }
        } catch (decodeError) {
            console.warn(`Could not decode JWS to find associated DID for deletion: ${decodeError}`);
        }
    }
    
    // Commit the atomic batch
    await batch.commit();

    revalidatePath('/credentials');
    return { message: 'Credential record and associated DID deleted successfully.', success: true };
  } catch (error: any) {
    console.error(`Error deleting credential record: ${error.message}`);
    return { message: `Error deleting credential record: ${error.message}`, success: false };
  }
}
