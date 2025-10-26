
'use server';

import { adminDb } from '@/lib/firebase/admin';
import * as jose from 'jose';

if (!adminDb) {
  console.warn("Firebase Admin DB is not initialized. Verification actions will fail.");
}

export async function verifyJws(jws: string): Promise<{ success: boolean; claims?: jose.JWTPayload; error?: string }> {
    if (!adminDb) {
        return { success: false, error: 'Server configuration error.' };
    }
    if (!jws || typeof jws !== 'string') {
        return { success: false, error: 'JWS is missing or invalid.' };
    }

    try {
        const decodedHeader = jose.decodeProtectedHeader(jws);

        if (!decodedHeader.kid || typeof decodedHeader.kid !== 'string') {
            throw new Error("El JWS no contiene un 'kid' (Key ID) en la cabecera.");
        }
        
        const did = decodedHeader.kid.split('#')[0];
        
        const didDocRef = adminDb.collection('dids').doc(did);
        const didDoc = await didDocRef.get();

        if (!didDoc.exists) {
            throw new Error(`El documento DID '${did}' no fue encontrado en Firestore.`);
        }

        const didDocument = didDoc.data();
        const verificationMethod = didDocument?.verificationMethod?.[0];
        if (!verificationMethod || !verificationMethod.publicKeyJwk) {
            throw new Error(`No se encontró un 'publicKeyJwk' válido en el documento DID para ${did}.`);
        }

        const publicKey = await jose.importJWK(verificationMethod.publicKeyJwk, 'ES256');
        const { payload } = await jose.jwtVerify(jws, publicKey);

        return { success: true, claims: payload };

    } catch (error: any) {
        console.error("Error verifying JWS:", error);
        return { success: false, error: error.message || "An unknown error occurred during JWS verification." };
    }
}

    