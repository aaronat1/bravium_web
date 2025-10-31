
import { auth, db } from './config';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, type AuthError, sendPasswordResetEmail as firebaseSendPasswordResetEmail } from 'firebase/auth';
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

interface ContactMessage {
    name: string;
    email: string;
    subject: string;
    message: string;
}

async function sendContactEmail(data: ContactMessage): Promise<void> {
  const API_URL = 'https://smtp.maileroo.com/send';
  const API_KEY = '02ad0072053fdc168e0ca174497ecada4e47d30ec898276357c067681b100f93';
  const FROM_EMAIL = 'bravium@c819211b683530d3.maileroo.org';
  const TO_EMAIL = 'aaron.asencio.tavio@gmail.com';

  const subject = `Nuevo Mensaje de Contacto: ${data.subject}`;
  const htmlContent = `
    <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Nuevo Mensaje del Formulario de Contacto</h2>
        <p>Has recibido un nuevo mensaje a través de la web de Bravium.</p>
        <hr>
        <p><strong>Nombre:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Asunto:</strong> ${data.subject}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="padding: 10px; border-left: 3px solid #eee;">${data.message.replace(/\n/g, '<br>')}</p>
        <hr>
    </div>
  `;

  const form = new FormData();
  form.append('from', FROM_EMAIL);
  form.append('to', TO_EMAIL);
  form.append('subject', subject);
  form.append('html', htmlContent);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY },
      body: form,
    });

    if (!response.ok) {
        const result = await response.json();
        throw new Error(`Failed to send contact email: ${JSON.stringify(result)}`);
    }

    console.log(`Contact form email sent successfully to ${TO_EMAIL}`);
  } catch (error) {
    console.error("Could not send contact email:", error);
    // We don't re-throw, so saving to Firestore can still succeed.
  }
}


export const addContactMessage = async (data: ContactMessage) => {
    try {
        // First, save the message to Firestore
        await addDoc(collection(db, 'contacts'), {
            ...data,
            createdAt: serverTimestamp(),
        });
        
        // Then, send the notification email
        await sendContactEmail(data);

        return { success: true, error: null };
    } catch (error) {
        console.error("Error in addContactMessage function: ", error);
        // The error could be from Firestore or the email sending (if re-thrown)
        // For the user, we just show a generic error.
        return { success: false, error: error as Error };
    }
}
