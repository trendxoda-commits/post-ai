
'use server';

/**
 * @fileOverview Post Scheduling Flow
 * This file contains the Genkit flow for scheduling a social media post.
 * - schedulePostFlow - Saves a post to Firestore to be published later.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';

const SchedulePostInputSchema = z.object({
  userId: z.string().describe("The ID of the user scheduling the post."),
  socialAccountIds: z.array(z.string()).describe("An array of SocialAccount document IDs to post to."),
  content: z.string().optional().describe("The caption or text content of the post."),
  mediaUrl: z.string().url().describe("URL of the post's primary image or video."),
  mediaType: z.enum(['IMAGE', 'VIDEO']).describe("The type of media."),
  scheduledAt: z.string().datetime().describe("The ISO 8601 timestamp when the post should be published."),
});
export type SchedulePostInput = z.infer<typeof SchedulePostInputSchema>;

const SchedulePostOutputSchema = z.object({
  scheduledPostId: z.string().describe('The ID of the newly created scheduled post document.'),
});
export type SchedulePostOutput = z.infer<typeof SchedulePostOutputSchema>;

// Initialize Firebase Admin SDK if not already initialized
let adminApp: App;
if (!getApps().length) {
    adminApp = initializeApp();
} else {
    adminApp = getApps()[0];
}

const schedulePostFlow = ai.defineFlow(
  {
    name: 'schedulePostFlow',
    inputSchema: SchedulePostInputSchema,
    outputSchema: SchedulePostOutputSchema,
  },
  async (input) => {
    const firestore = getFirestore(adminApp);
    
    const newScheduledPostRef = firestore.collection(`users/${input.userId}/scheduledPosts`).doc();
    
    await newScheduledPostRef.set({
      ...input,
      id: newScheduledPostRef.id,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    });
    
    // In a real application, you would also trigger a Cloud Task or some other mechanism
    // to actually execute the post at the `scheduledAt` time.
    // For this prototype, we'll just save it to the database.

    return { scheduledPostId: newScheduledPostRef.id };
  }
);

export async function schedulePost(input: SchedulePostInput): Promise<SchedulePostOutput> {
  return schedulePostFlow(input);
}
