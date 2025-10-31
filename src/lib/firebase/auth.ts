
import { auth } from './config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, type AuthError, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';

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

export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error: AuthError | null }> => {
    if (!auth) {
        return { success: false, error: { code: 'auth/unavailable', message: 'Firebase Auth is not initialized.'} as AuthError };
    }
    try {
        await firebaseSendPasswordResetEmail(auth, email);
        return { success: true, error: null };
    } catch (error) {
        return { success: false, error: error as AuthError };
    }
};
