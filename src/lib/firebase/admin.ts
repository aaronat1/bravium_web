
// lib/firebase/admin.ts
// Archivo **sólo** de servidor
import 'server-only';
import { getApps, initializeApp, cert, AppOptions } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

function readEnv(name: string) {
  const v = process.env[name];
  if (!v) console.error(`[firebase/admin] Falta la env ${name}`);
  return v;
}

// ❌ NO uses NEXT_PUBLIC_ aquí
const projectId   = readEnv('FIREBASE_PROJECT_ID');
const clientEmail = readEnv('FIREBASE_CLIENT_EMAIL');

let privateKey = readEnv('FIREBASE_PRIVATE_KEY');
// Vercel/otros guardan saltos como "\n"
if (privateKey) {
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const options: AppOptions =
  projectId && clientEmail && privateKey
    ? { credential: cert({ projectId, clientEmail, privateKey }) }
    : {};

const app = getApps().length ? getApps()[0] : initializeApp(options);

export const adminAuth: Auth | undefined = (() => {
  try {
    return getAuth(app);
  } catch (e) {
    console.error('[firebase/admin] Error obteniendo Auth:', e);
    return undefined;
  }
})();

export const adminDb: Firestore | undefined = (() => {
  try {
    return getFirestore(app);
  } catch (e) {
    console.error('[firebase/admin] Error obteniendo Firestore:', e);
    return undefined;
  }
})();
