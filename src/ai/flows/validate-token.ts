
'use server';

/**
 * @fileOverview Token Validation Flow
 * This file contains a Genkit flow for validating a Facebook/Instagram user access token.
 * - validateToken - Checks if a given access token is still valid.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const ValidateTokenInputSchema = z.object({
  accessToken: z.string().describe('The user access token to validate.'),
});
export type ValidateTokenInput = z.infer<typeof ValidateTokenInputSchema>;

const ValidateTokenOutputSchema = z.object({
  isValid: z.boolean().describe('True if the token is valid, false otherwise.'),
  error: z.string().optional().describe('Details of the error if the token is invalid.'),
});
export type ValidateTokenOutput = z.infer<typeof ValidateTokenOutputSchema>;

const validateTokenFlow = ai.defineFlow(
  {
    name: 'validateTokenFlow',
    inputSchema: ValidateTokenInputSchema,
    outputSchema: ValidateTokenOutputSchema,
  },
  async ({ accessToken }) => {
    // The debug_token endpoint is the standard way to check token validity.
    const url = `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${accessToken}`;

    try {
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.data?.is_valid) {
        return { isValid: true };
      } else {
        return { 
          isValid: false, 
          error: data.data?.error?.message || 'Token is invalid or has expired.' 
        };
      }
    } catch (error: any) {
      console.error('Error validating token:', error);
      return { 
        isValid: false, 
        error: error.message || 'An unexpected error occurred during token validation.' 
      };
    }
  }
);

export async function validateToken(input: ValidateTokenInput): Promise<ValidateTokenOutput> {
  return validateTokenFlow(input);
}
