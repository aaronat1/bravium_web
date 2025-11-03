
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

// Lee las credenciales de las variables de entorno
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// El private key necesita un reemplazo por los saltos de línea
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// Inicializa Firebase Admin SÓLO si no está ya inicializado
if (!admin.apps.length) {
  // Asegúrate de que todas las variables de entorno necesarias existan
  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK inicializado correctamente.');
      adminAuth = admin.auth();
      adminDb = admin.firestore();
    } catch (error: any) {
      console.error('ERROR AL INICIALIZAR FIREBASE ADMIN:', error.message);
      // adminDb y adminAuth se quedarán como `undefined` si falla la inicialización
    }
  } else {
    console.warn('ADVERTENCIA: Las credenciales del SDK de Admin no están configuradas completamente en las variables de entorno. Las funciones de administrador podrían no estar disponibles.');
  }
} else {
  // Si la app ya está inicializada, simplemente obtenemos las instancias
  adminAuth = admin.app().auth();
  adminDb = admin.app().firestore();
}

export { adminAuth, adminDb };
