
'use server';

/**
 * @fileOverview Instagram Post Flow
 * This file contains a Genkit flow for posting an image or video to Instagram.
 * - postToInstagram - Posts media to a user's Instagram account.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const PostToInstagramInputSchema = z.object({
  instagramUserId: z.string().describe('The Instagram User ID.'),
  mediaUrl: z.string().url().describe('The public URL of the media to post.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).describe('The type of media being posted.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with instagram_content_publish permission.'),
});
export type PostToInstagramInput = z.infer<typeof PostToInstagramInputSchema>;

const PostToInstagramOutputSchema = z.object({
  postId: z.string().describe('The ID of the created Instagram post.'),
});
export type PostToInstagramOutput = z.infer<typeof PostToInstagramOutputSchema>;

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// Helper function for robust error handling
async function handleInstagramError(response: Response, context: string): Promise<never> {
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


const postToInstagramFlow = ai.defineFlow(
  {
    name: 'postToInstagramFlow',
    inputSchema: PostToInstagramInputSchema,
    outputSchema: PostToInstagramOutputSchema,
  },
  async ({ instagramUserId, mediaUrl, mediaType, caption, pageAccessToken }) => {
    if (!pageAccessToken) {
      throw new Error('Instagram Page Access Token is required.');
    }
    
    // Step 1: Create a container for the media
    const containerUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media`;
    
    const containerParams = new URLSearchParams({
        access_token: pageAccessToken,
    });

    // DECISIVE FIX: Correctly set media_type for videos at the container creation step.
    if (mediaType === 'VIDEO') {
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', mediaUrl);
    } else { // IMAGE
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
        await handleInstagramError(containerResponse, 'Failed to create Instagram media container');
    }

    const containerData: any = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      throw new Error('Failed to get creation ID from Instagram.');
    }

    // Step 2: Poll for container status until it is 'FINISHED'
    let containerStatus = '';
    let pollingAttempts = 0;
    const maxPollingAttempts = 20; // Increased attempts for video processing

    while (containerStatus !== 'FINISHED' && pollingAttempts < maxPollingAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time
        
        const statusUrl = `${INSTAGRAM_GRAPH_API_URL}/${creationId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);
        
        if (!statusResponse.ok) {
             // If polling fails, it might be a temporary issue, but we should log it.
             console.error(`Polling attempt ${pollingAttempts + 1} failed:`, await statusResponse.text());
             pollingAttempts++;
             continue; // Continue to the next attempt
        }

        const statusData: any = await statusResponse.json();
        
        containerStatus = statusData.status_code;
        pollingAttempts++;

        if (containerStatus === 'ERROR') {
             // The container failed to process on Instagram's side.
             // It's helpful to fetch the error details from the container status endpoint.
             const errorDetailsUrl = `${INSTAGRAM_GRAPH_API_URL}/${creationId}?fields=error_message&access_token=${pageAccessToken}`;
             let errorMessage = 'Media container processing failed on Instagram.';
             try {
                const errorDetailsResponse = await fetch(errorDetailsUrl);
                if(errorDetailsResponse.ok) {
                    const errorDetailsData: any = await errorDetailsResponse.json();
                    errorMessage = errorDetailsData.error_message || errorMessage;
                }
             } catch(e) {
                // Ignore if we can't get the specific error message
             }
             throw new Error(errorMessage);
        }
    }

    if (containerStatus !== 'FINISHED') {
        throw new Error('Media container did not finish processing in time.');
    }


    // Step 3: Publish the container
    const publishUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media_publish`;
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: pageAccessToken,
    });
    
    const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        body: publishParams,
    });

    if (!publishResponse.ok) {
        await handleInstagramError(publishResponse, 'Failed to publish Instagram media');
    }

    const publishData: any = await publishResponse.json();
    const postId = publishData.id;

    if (!postId) {
        throw new Error('Failed to get post ID from Instagram after publishing.');
    }

    return { postId };
  }
);


export async function postToInstagram(input: PostToInstagramInput): Promise<PostToInstagramOutput> {
    // This is a wrapper function to call the Genkit flow.
    return postToInstagramFlow(input);
}
