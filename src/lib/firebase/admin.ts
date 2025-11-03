
import * as admin from 'firebase-admin';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

// This check prevents Next.js from trying to re-initialize the app on every hot-reload
if (!admin.apps.length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialized successfully.');
      adminAuth = admin.auth();
      adminDb = admin.firestore();
    } catch (error: any) {
      console.error('ERROR INITIALIZING FIREBASE ADMIN:', error.message);
    }
  } else {
    console.warn('WARNING: Firebase Admin credentials are not fully set in environment variables. Admin features might be unavailable.');
  }
} else {
  // If the app is already initialized, get the instances. This is common in development with hot-reloading.
  if (admin.apps[0]) {
    adminAuth = admin.apps[0].auth();
    adminDb = admin.apps[0].firestore();
  }
}

export { adminAuth, adminDb };
