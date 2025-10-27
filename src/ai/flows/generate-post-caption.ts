'use server';

/**
 * @fileOverview An AI agent to generate a social media post caption from a topic.
 *
 * - generatePostCaption - A function that generates a post caption.
 * - GeneratePostCaptionInput - The input type for the generatePostCaption function.
 * - GeneratePostCaptionOutput - The return type for the generatePostcaption function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GeneratePostCaptionInputSchema = z.object({
  topic: z.string().describe('The topic or keywords to write a post about.'),
});
export type GeneratePostCaptionInput = z.infer<
  typeof GeneratePostCaptionInputSchema
>;

const GeneratePostCaptionOutputSchema = z.object({
  caption: z
    .string()
    .describe('The generated social media post caption, including hashtags.'),
});
export type GeneratePostCaptionOutput = z.infer<
  typeof GeneratePostCaptionOutputSchema
>;

export async function generatePostCaption(
  input: GeneratePostCaptionInput
): Promise<GeneratePostCaptionOutput> {
  return generatePostCaptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePostCaptionPrompt',
  input: { schema: GeneratePostCaptionInputSchema },
  output: { schema: GeneratePostCaptionOutputSchema },
  prompt: `You are an expert social media manager. You will generate a compelling and engaging social media post caption based on the provided topic.

The caption should be concise, eye-catching, and appropriate for platforms like Instagram and Facebook.
Include 2-3 relevant and popular hashtags at the end of the caption.

Topic: {{{topic}}}
`,
});

const generatePostCaptionFlow = ai.defineFlow(
  {
    name: 'generatePostCaptionFlow',
    inputSchema: GeneratePostCaptionInputSchema,
    outputSchema: GeneratePostCaptionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
