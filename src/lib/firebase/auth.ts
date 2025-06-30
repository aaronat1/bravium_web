import { auth, db } from './config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, type AuthError } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const signIn = async (email: string, password: string): Promise<{ user: any; error: AuthError | null }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error as AuthError };
  }
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error as AuthError };
  }
};

interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

export const addContactMessage = async (data: ContactMessage) => {
    try {
        await addDoc(collection(db, 'contacts'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        return { success: true, error: null };
    } catch (error) {
        console.error("Error adding document: ", error);
        return { success: false, error: error as Error };
    }
}
