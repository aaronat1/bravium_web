import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// The private key must be wrapped in quotes in the .env file to handle newlines correctly.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;


if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
        try {
            admin.initializeApp({
              credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
              }),
            });
            adminAuth = admin.auth();
            adminDb = admin.firestore();
        } catch (error) {
            console.error("Error initializing Firebase Admin SDK in main app:", error);
        }
    } else {
        console.warn('WARNING: Admin SDK credentials not set in the root .env file. Admin features may not be available in Server Actions.');
    }
} else {
    // If the app is already initialized, get the existing instances.
    const app = admin.app();
    adminAuth = admin.auth(app);
    adminDb = admin.firestore(app);
}

export { adminAuth, adminDb };
