
'use server';

/**
 * @fileOverview Facebook Post Scheduling Flow
 * This file contains a Genkit flow for scheduling a post to a Facebook Page.
 * - scheduleFacebookPost - Schedules media to a user's Facebook Page for a future time.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const ScheduleFacebookPostInputSchema = z.object({
  facebookPageId: z.string().describe('The ID of the Facebook Page.'),
  mediaUrl: z.string().url().describe('The public URL of the media to post.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).describe('The type of media being posted.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with pages_manage_posts permission.'),
  scheduledPublishTime: z.number().int().positive().describe('A Unix timestamp (in seconds) for when the post should be published.'),
});
export type ScheduleFacebookPostInput = z.infer<typeof ScheduleFacebookPostInputSchema>;

const ScheduleFacebookPostOutputSchema = z.object({
  postId: z.string().describe('The ID of the scheduled Facebook post.'),
});
export type ScheduleFacebookPostOutput = z.infer<typeof ScheduleFacebookPostOutputSchema>;

const FACEBOOK_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

async function handleFacebookError(response: Response, context: string): Promise<never> {
    let errorDetails = 'Unknown error';
    try {
        const errorData: any = await response.json();
        console.error(`${context} (JSON response):`, errorData);
        errorDetails = errorData.error?.message || JSON.stringify(errorData);
    } catch (e) {
        const errorText = await response.text();
        console.error(`${context} (text response):`, errorText);
        errorDetails = errorText;
    }
    throw new Error(`${context}: ${errorDetails}`);
}

const scheduleFacebookPostFlow = ai.defineFlow(
  {
    name: 'scheduleFacebookPostFlow',
    inputSchema: ScheduleFacebookPostInputSchema,
    outputSchema: ScheduleFacebookPostOutputSchema,
  },
  async ({ facebookPageId, mediaUrl, mediaType, caption, pageAccessToken, scheduledPublishTime }) => {
    
    let endpoint: string;
    const bodyParams = new URLSearchParams({
        published: 'false',
        scheduled_publish_time: scheduledPublishTime.toString(),
    });

    if (mediaType === 'VIDEO') {
        endpoint = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/videos`;
        bodyParams.append('file_url', mediaUrl);
        if (caption) {
            bodyParams.append('description', caption);
        }
    } else { // IMAGE
        endpoint = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/photos`;
        bodyParams.append('url', mediaUrl);
        if (caption) {
            bodyParams.append('caption', caption);
        }
    }
    
    const postUrl = `${endpoint}?access_token=${pageAccessToken}`;

    const response = await fetch(postUrl, {
        method: 'POST',
        body: bodyParams,
    });

    if (!response.ok) {
        await handleFacebookError(response, 'Failed to schedule post on Facebook');
    }

    const responseData: any = await response.json();
    
    // For scheduled posts, the ID is directly in `id`. `post_id` is for immediate posts.
    const postId = responseData.id;
    if (!postId) {
        throw new Error('Failed to get post ID from Facebook after scheduling.');
    }

    return { postId };
  }
);


export async function scheduleFacebookPost(input: ScheduleFacebookPostInput): Promise<ScheduleFacebookPostOutput> {
    return scheduleFacebookPostFlow(input);
}
