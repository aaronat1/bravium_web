import { auth } from './config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, type AuthError } from 'firebase/auth';

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
