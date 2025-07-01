import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
    if (!projectId || !clientEmail || !privateKey) {
        console.error('-------------------------------------------------------------------------------------------------');
        console.error('ERROR: Las credenciales del SDK de Firebase Admin no están configuradas.');
        console.error('Asegúrate de tener un fichero .env con las variables NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.');
        console.error('-------------------------------------------------------------------------------------------------');
    } else {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } catch (error) {
        console.error("Error al inicializar Firebase Admin:", error);
      }
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
