
'use server';

import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';

export type CredentialDetails = {
    id: string;
    templateName: string;
    recipientData: Record<string, any>;
    issuedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    customerId: string;
};


export async function getCredentialDetailsByJws(jws: string): Promise<{ success: boolean; data?: CredentialDetails | null; message?: string }> {
    if (!adminDb) {
        return { success: false, message: 'Server configuration error.' };
    }
    if (!jws) {
        return { success: false, message: 'JWS is required.' };
    }

    try {
        const credentialsRef = adminDb.collection('issuedCredentials');
        const q = credentialsRef.where('jws', '==', jws).limit(1);
        const snapshot = await q.get();

        if (snapshot.empty) {
            return { success: true, data: null, message: 'No credential found for the given JWS.' };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        
        const issuedAtObject = {
            _seconds: data.issuedAt._seconds,
            _nanoseconds: data.issuedAt._nanoseconds,
        };

        const result: CredentialDetails = {
            id: doc.id,
            templateName: data.templateName,
            recipientData: data.recipientData,
            issuedAt: issuedAtObject,
            customerId: data.customerId,
        };

        return { success: true, data: result };

    } catch (error: any) {
        console.error("Error fetching credential by JWS:", error);
        return { success: false, message: `Failed to fetch credential: ${error.message}` };
    }
}
