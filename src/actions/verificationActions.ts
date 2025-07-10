
'use server';

import { verifyPresentation } from '@/ai/flows/verify-presentation-flow';

// This file is simplified as request generation is now handled by the Cloud Function.

export async function processVerificationResponse(vpToken: any, state: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyPresentation({ vp_token: vpToken, state });
        return { success: true, message: 'Presentation verified successfully.' };
    } catch (error: any) {
        console.error("Error processing verification response:", error);
        return { success: false, message: `Verification failed: ${error.message}` };
    }
}
