'use server';

/**
 * @fileOverview An AI agent to suggest trending hashtags for social media posts.
 *
 * - getTrendingHashtags - A function that generates trending hashtag suggestions.
 * - TrendingHashtagsInput - The input type for the getTrendingHashtags function.
 * - TrendingHashtagsOutput - The return type for the getTrendingHashtags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrendingHashtagsInputSchema = z.object({
  accountDescription: z
    .string()
    .describe('A description of the user account and its typical content.'),
  recentPosts: z
    .string()
    .describe(
      'A summary of the users recent posts, including topics and content types.'
    ),
});

export type TrendingHashtagsInput = z.infer<typeof TrendingHashtagsInputSchema>;

const TrendingHashtagsOutputSchema = z.object({
  hashtags: z
    .array(z.string())
    .describe(
      'An array of trending hashtags relevant to the account description and recent posts.'
    ),
});

export type TrendingHashtagsOutput = z.infer<typeof TrendingHashtagsOutputSchema>;

export async function getTrendingHashtags(
  input: TrendingHashtagsInput
): Promise<TrendingHashtagsOutput> {
  return trendingHashtagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'trendingHashtagsPrompt',
  input: {schema: TrendingHashtagsInputSchema},
  output: {schema: TrendingHashtagsOutputSchema},
  prompt: `You are a social media expert. You will generate trending hashtags based on the user's account description and recent posts.

Account Description: {{{accountDescription}}}
Recent Posts: {{{recentPosts}}}

Trending Hashtags:`,
});

const trendingHashtagsFlow = ai.defineFlow(
  {
    name: 'trendingHashtagsFlow',
    inputSchema: TrendingHashtagsInputSchema,
    outputSchema: TrendingHashtagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
