
'use server';
/**
 * @fileOverview A Genkit tool to ensure a customer has a KMS key.
 * This tool checks if a customer document in Firestore has a `kmsKeyPath`.
 * If not, it generates a new KMS key and a corresponding DID, then updates
 * the customer document. This is crucial for bootstrapping customers or
 * fixing existing ones that missed the onCustomerCreate trigger.
 */

import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase/admin';
import { KeyManagementServiceClient } from '@google-cloud/kms';
import { z } from 'zod';

if (!adminDb) {
  throw new Error("Firebase Admin DB is not initialized. Tools will fail.");
}

const kmsClient = new KeyManagementServiceClient();
const GCP_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const KMS_LOCATION_ID = 'global';
const KMS_KEYRING_ID = 'bravium-keys';

async function generateKmsKeyForCustomer(customerId: string) {
    if (!GCP_PROJECT_ID) {
        throw new Error("GCLOUD_PROJECT environment variable is not set.");
    }
    const keyRingPath = kmsClient.keyRingPath(GCP_PROJECT_ID, KMS_LOCATION_ID, KMS_KEYRING_ID);
    const cryptoKeyId = `customer-${customerId}-key`;
    const fullKeyPath = `${keyRingPath}/cryptoKeys/${cryptoKeyId}`;

    try {
        const [existingKey] = await kmsClient.getCryptoKey({ name: fullKeyPath }).catch(() => [null]);
        if (existingKey) {
            console.log(`KMS key for ${customerId} already exists.`);
            return existingKey.name;
        }
    } catch (e) {
        // Ignore error if key doesn't exist, which is the expected case for creation.
    }

    const [key] = await kmsClient.createCryptoKey({
        parent: keyRingPath,
        cryptoKeyId: cryptoKeyId,
        cryptoKey: {
            purpose: 'ASYMMETRIC_SIGN',
            versionTemplate: {
                algorithm: 'EC_SIGN_P256_SHA256',
                protectionLevel: 'SOFTWARE',
            },
            labels: {
                'customer-id': customerId.replace(/[^a-z0-9-]/gi, '_').toLowerCase()
            }
        },
    });

    if (!key.name) {
        throw new Error('KMS key creation did not return a resource name.');
    }
    return key.name;
}

async function generateDidForCustomer(customerId: string, kmsKeyPath: string) {
    const jose = await import('jose');
    const [publicKey] = await kmsClient.getPublicKey({ name: `${kmsKeyPath}/cryptoKeyVersions/1` });

    if (!publicKey.pem) {
        throw new Error(`Could not retrieve public key in PEM format from KMS for key: ${kmsKeyPath}`);
    }

    const key = await jose.importSPKI(publicKey.pem, 'ES256');
    const exportedJwk = await jose.exportJWK(key);

    const did = `did:bravium:${customerId}`;
    const verificationMethodId = `${did}#keys-1`;

    const didDocument = {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
        id: did,
        controller: did,
        verificationMethod: [{
            id: verificationMethodId,
            type: 'JsonWebKey2020',
            controller: did,
            publicKeyJwk: exportedJwk,
        }],
        authentication: [verificationMethodId],
        assertionMethod: [verificationMethodId],
    };

    return { did, didDocument };
}

export const ensureKmsKey = ai.defineTool(
  {
    name: 'ensureKmsKey',
    description: 'Checks if a customer has a KMS key and creates one if not. Returns the KMS key path.',
    inputSchema: z.object({
      customerId: z.string().describe('The ID of the customer to check.'),
    }),
    outputSchema: z.string().describe('The KMS key path for the customer.'),
  },
  async ({ customerId }) => {
    if (!adminDb) {
        throw new Error("Firestore Admin SDK is not available.");
    }
    const customerRef = adminDb.collection('customers').doc(customerId);
    const customerDoc = await customerRef.get();

    if (!customerDoc.exists) {
      throw new Error(`Customer with ID ${customerId} does not exist.`);
    }

    const customerData = customerDoc.data();
    if (customerData?.kmsKeyPath) {
      console.log(`KMS key already exists for customer ${customerId}.`);
      return customerData.kmsKeyPath;
    }

    console.log(`KMS key not found for customer ${customerId}. Generating a new one...`);
    
    // Key is missing, generate it now.
    const kmsKeyPath = await generateKmsKeyForCustomer(customerId);
    const { did, didDocument } = await generateDidForCustomer(customerId, kmsKeyPath);

    await adminDb.collection('dids').doc(did).set(didDocument);
    
    await customerRef.update({
      did: did,
      kmsKeyPath: kmsKeyPath,
      onboardingStatus: 'completed',
    });

    console.log(`Successfully generated and stored KMS key and DID for customer ${customerId}.`);
    return kmsKeyPath;
  }
);
