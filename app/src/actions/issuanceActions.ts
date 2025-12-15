
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getFunctions } from 'firebase-admin/functions';

// This file is now deprecated as the client calls the Cloud Function directly.
// The logic has been moved to the respective client components.
// We keep the file to avoid breaking imports, but the functions are no longer used
// in the primary issuance flow that relies on the advanced Cloud Function.


// This function is no longer called by the main issuance flow.
export async function saveIssuedCredential(data: any): Promise<{ success: boolean; message: string, id?: string }> {
    if (!adminDb) {
        return { success: false, message: 'Server configuration error.' };
    }

    try {
        const docRef = await adminDb.collection('issuedCredentials_legacy_save').add({
            ...data,
            issuedAt: FieldValue.serverTimestamp(),
        });
        revalidatePath('/credentials');
        return { success: true, message: 'Credential issuance recorded (legacy).', id: docRef.id };
    } catch (error: any) {
        return { success: false, message: `Failed to record credential (legacy): ${error.message}` };
    }
}


// This function is also deprecated in favor of direct client-side calls.
export async function issueDemoCredential(
    credentialSubject: Record<string, any>,
    templateName: string,
    templateId: string,
    email: string
): Promise<{ success: boolean; jws?: string; id?: string; message: string }> {
    return { success: false, message: "This function is deprecated." };
}

    