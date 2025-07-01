import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
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
            console.error("Error al inicializar Firebase Admin:", error);
        }
    } else {
        console.warn('ADVERTENCIA: Las credenciales del SDK de Firebase Admin no están configuradas en el fichero .env. Las funcionalidades de administrador (como crear clientes) no estarán disponibles.');
    }
} else {
    // If the app is already initialized, get the existing instances.
    const app = admin.app();
    adminAuth = admin.auth(app);
    adminDb = admin.firestore(app);
}

export { adminAuth, adminDb };
