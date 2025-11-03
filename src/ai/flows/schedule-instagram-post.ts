
'use server';

/**
 * @fileOverview Instagram Post Scheduling Flow
 * This file contains a Genkit flow for scheduling a post to Instagram.
 * - scheduleInstagramPost - Schedules media for a user's Instagram account.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const ScheduleInstagramPostInputSchema = z.object({
  instagramUserId: z.string().describe('The Instagram User ID.'),
  mediaUrl: z.string().url().describe('The public URL of the media to post.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).describe('The type of media being posted.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with instagram_content_publish permission.'),
  scheduledPublishTime: z.number().int().positive().describe('A Unix timestamp (in seconds) for when the post should be published.'),
});
export type ScheduleInstagramPostInput = z.infer<typeof ScheduleInstagramPostInputSchema>;

const ScheduleInstagramPostOutputSchema = z.object({
  postId: z.string().describe('The ID of the created (but not yet published) Instagram post.'),
});
export type ScheduleInstagramPostOutput = z.infer<typeof ScheduleInstagramPostOutputSchema>;

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

async function handleInstagramError(response: Response, context: string): Promise<never> {
    let errorDetails = 'Unknown error';
    try {
        const errorData: any = await response.json();
        console.error(`${context} (JSON response):`, errorData);
        errorDetails = errorData.error?.error_user_title || errorData.error?.message || JSON.stringify(errorData);
    } catch (e) {
        const errorText = await response.text();
        console.error(`${context} (text response):`, errorText);
        errorDetails = errorText;
    }
    throw new Error(`${context}: ${errorDetails}`);
}


const scheduleInstagramPostFlow = ai.defineFlow(
  {
    name: 'scheduleInstagramPostFlow',
    inputSchema: ScheduleInstagramPostInputSchema,
    outputSchema: ScheduleInstagramPostOutputSchema,
  },
  async ({ instagramUserId, mediaUrl, mediaType, caption, pageAccessToken, scheduledPublishTime }) => {
    // Step 1: Create a container for the media. This is the same for scheduled posts.
    const containerUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media`;
    
    const containerParams = new URLSearchParams({ access_token: pageAccessToken });

    if (mediaType === 'VIDEO') {
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', mediaUrl);
    } else {
        containerParams.append('image_url', mediaUrl);
    }
    if (caption) {
        containerParams.append('caption', caption);
    }

    const containerResponse = await fetch(containerUrl, {
      method: 'POST',
      body: containerParams,
    });

    if (!containerResponse.ok) {
        await handleInstagramError(containerResponse, 'Failed to create Instagram media container for scheduling');
    }

    const containerData: any = await containerResponse.json();
    const creationId = containerData.id;
    if (!creationId) {
      throw new Error('Failed to get creation ID from Instagram for scheduling.');
    }

    // Step 2 (Optional but Recommended): Poll for container status.
    // For scheduling, you don't strictly need to wait for FINISHED, but it's good practice.
    // Let's keep the polling logic for reliability.
    let containerStatus = '';
    let pollingAttempts = 0;
    while (containerStatus !== 'FINISHED' && pollingAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusUrl = `${INSTAGRAM_GRAPH_API_URL}/${creationId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        if (!statusResponse.ok) {
             console.warn(`Polling attempt ${pollingAttempts + 1} failed for scheduled post:`, await statusResponse.text());
             pollingAttempts++;
             continue; 
        }
        const statusData: any = await statusResponse.json();
        containerStatus = statusData.status_code;
        pollingAttempts++;
        if (containerStatus === 'ERROR') {
             throw new Error('Media container processing failed on Instagram during scheduling.');
        }
    }
    if (containerStatus !== 'FINISHED') {
        throw new Error('Media container for scheduled post did not finish processing in time.');
    }

    // Step 3: Publish the container WITH the scheduling parameter.
    const publishUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: pageAccessToken,
      // The key difference for scheduling is adding this parameter
      scheduled_publish_time: scheduledPublishTime.toString(),
    });
    
    const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        body: publishParams,
    });

    if (!publishResponse.ok) {
        await handleInstagramError(publishResponse, 'Failed to schedule Instagram media');
    }

    const publishData: any = await publishResponse.json();
    const postId = publishData.id;
    if (!postId) {
        throw new Error('Failed to get post ID from Instagram after scheduling.');
    }

    return { postId };
  }
);


export async function scheduleInstagramPost(input: ScheduleInstagramPostInput): Promise<ScheduleInstagramPostOutput> {
    return scheduleInstagramPostFlow(input);
}
