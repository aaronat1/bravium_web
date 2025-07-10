
'use server';

import { verifyPresentation, generateRequest } from '@/ai/flows/verify-presentation-flow';
import type { GenerateRequestOutput } from '@/ai/flows/verify-presentation-flow';

export type GenerateVerificationRequestOutput = GenerateRequestOutput;

export async function generateVerificationRequest(): Promise<{ success: boolean; data?: GenerateVerificationRequestOutput; message?: string }> {
  try {
    const result = await generateRequest();
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error generating verification request:", error);
    return { success: false, message: `AI Error: ${error.message}` };
  }
}

export async function processVerificationResponse(vpToken: any, state: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyPresentation({ vp_token: vpToken, state });
        return { success: true, message: 'Presentation verified successfully.' };
    } catch (error: any) {
        console.error("Error processing verification response:", error);
        return { success: false, message: `Verification failed: ${error.message}` };
    }
}
