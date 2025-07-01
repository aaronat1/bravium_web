import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!getApps().length) {
    // Si las credenciales no están presentes, la funcionalidad del admin no puede operar.
    // Lanzar un error aquí detiene la ejecución y proporciona un mensaje claro sobre la causa raíz,
    // previniendo errores más crípticos más adelante.
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('ERROR CRÍTICO: Las credenciales del SDK de Firebase Admin no están configuradas. Asegúrate de que las variables de entorno NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY están definidas en tu fichero .env');
    }

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
        // Relanzar el error es importante para que la aplicación no continúe en un estado inconsistente.
        throw error;
    }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
