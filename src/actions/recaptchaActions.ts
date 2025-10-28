
'use server';

import { z } from 'zod';

const verifyRecaptchaResponseSchema = z.object({
  success: z.boolean(),
  'error-codes': z.array(z.string()).optional(),
});

export async function verifyRecaptcha(token: string): Promise<{ success: boolean; message: string }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error("RECAPTCHA_SECRET_KEY is not set.");
    return { success: false, message: 'Server configuration error.' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const result = await response.json();
    const validatedResult = verifyRecaptchaResponseSchema.safeParse(result);

    if (!validatedResult.success) {
      console.error("Invalid reCAPTCHA response format:", validatedResult.error);
      return { success: false, message: 'Invalid reCAPTCHA response format.' };
    }
    
    if (!validatedResult.data.success) {
      console.warn("reCAPTCHA verification failed:", validatedResult.data['error-codes']);
      return { success: false, message: `reCAPTCHA verification failed: ${validatedResult.data['error-codes']?.join(', ')}`};
    }
    
    return { success: true, message: 'reCAPTCHA verified successfully.' };

  } catch (error: any) {
    console.error("Error verifying reCAPTCHA:", error);
    return { success: false, message: `Failed to verify reCAPTCHA: ${error.message}` };
  }
}
