
'use server';

/**
 * @fileOverview Bulk Post Processor Flow
 * This file contains a "fire-and-forget" Genkit flow for processing bulk posts in the background.
 * - bulkPostProcessorFlow - Takes a list of posting jobs and executes them sequentially without blocking the UI.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { postToFacebook } from './post-to-facebook';
import { postToInstagram } from './post-to-instagram';

// Define the schema for a single post job
const PostJobSchema = z.object({
  platform: z.enum(['Facebook', 'Instagram']),
  accountId: z.string(),
  pageAccessToken: z.string(),
  mediaUrl: z.string().url(),
  mediaType: z.enum(['IMAGE', 'VIDEO']),
  caption: z.string().optional(),
});

// Define the input schema for the main flow, which is an array of post jobs
const BulkPostProcessorInputSchema = z.object({
  jobs: z.array(PostJobSchema),
});
export type BulkPostProcessorInput = z.infer<typeof BulkPostProcessorInputSchema>;


const bulkPostProcessorFlow = ai.defineFlow(
  {
    name: 'bulkPostProcessorFlow',
    inputSchema: BulkPostProcessorInputSchema,
    outputSchema: z.void(), // This flow doesn't need to return anything to the caller
  },
  async ({ jobs }) => {
    console.log(`Starting bulk post processing for ${jobs.length} jobs.`);

    // Process each job sequentially to avoid overwhelming APIs
    for (const job of jobs) {
      try {
        if (job.platform === 'Facebook') {
          await postToFacebook({
            facebookPageId: job.accountId,
            mediaUrl: job.mediaUrl,
            mediaType: job.mediaType,
            caption: job.caption,
            pageAccessToken: job.pageAccessToken,
          });
          console.log(`Successfully posted to Facebook account ${job.accountId}.`);
        } else if (job.platform === 'Instagram') {
          await postToInstagram({
            instagramUserId: job.accountId,
            mediaUrl: job.mediaUrl,
            mediaType: job.mediaType,
            caption: job.caption,
            pageAccessToken: job.pageAccessToken,
          });
          console.log(`Successfully posted to Instagram account ${job.accountId}.`);
        }
      } catch (error: any) {
        // Log the error but continue to the next job
        console.error(`Failed to post to ${job.platform} account ${job.accountId}:`, error.message);
      }
    }

    console.log('Finished bulk post processing.');
  }
);


// This is the wrapper function that will be called from the server action.
// It initiates the flow but does NOT wait for it to complete.
export function triggerBulkPostProcessing(input: BulkPostProcessorInput) {
  // Fire-and-forget: we call the flow but don't await its result.
  // The flow will run in the background on the Genkit/server environment.
  bulkPostProcessorFlow(input);
}
