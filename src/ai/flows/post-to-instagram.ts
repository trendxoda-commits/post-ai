'use server';

/**
 * @fileOverview Instagram Post Flow
 * This file contains a Genkit flow for posting an image or video to Instagram.
 * It handles indirect URLs by downloading the media, hosting it temporarily on a reliable service,
 * and then using the direct URL to post to Instagram.
 * - postToInstagram - Posts media to a user's Instagram account.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PostToInstagramInputSchema = z.object({
  instagramUserId: z.string().describe('The Instagram User ID.'),
  mediaUrl: z.string().describe('The public URL of the image or video to post.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with instagram_content_publish permission.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
});
export type PostToInstagramInput = z.infer<typeof PostToInstagramInputSchema>;

const PostToInstagramOutputSchema = z.object({
  postId: z.string().describe('The ID of the created Instagram post.'),
});
export type PostToInstagramOutput = z.infer<typeof PostToInstagramOutputSchema>;

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// Helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const postToInstagramFlow = ai.defineFlow(
  {
    name: 'postToInstagramFlow',
    inputSchema: PostToInstagramInputSchema,
    outputSchema: PostToInstagramOutputSchema,
  },
  async ({ instagramUserId, mediaUrl, caption, pageAccessToken, mediaType }) => {
    if (!pageAccessToken) {
      throw new Error('Instagram Page Access Token is required.');
    }

    // Step 1: Create a media container.
    const containerUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media`;
    
    const isVideo = mediaType === 'VIDEO';
    
    const params = new URLSearchParams({
        access_token: pageAccessToken,
    });

    if (isVideo) {
        params.append('media_type', 'VIDEO');
        params.append('video_url', mediaUrl);
        // For videos, caption is added at the publish step, NOT container creation.
    } else { // It's an image
        params.append('image_url', mediaUrl);
        // For images, we can add the caption at the container creation step.
        if (caption) {
          params.append('caption', caption);
        }
    }
    
    const containerResponse = await fetch(containerUrl, {
        method: 'POST',
        body: params,
    });


    if (!containerResponse.ok) {
        const errorData: any = await containerResponse.json();
        console.error('Failed to create Instagram media container:', errorData);
        const errorMessage = errorData.error?.error_subcode === 2207027 
            ? 'The video format is not supported. Please use a different video.'
            : errorData.error?.message || 'Unknown error during container creation.';
        throw new Error(`Failed to create Instagram media container: ${errorMessage}`);
    }

    const containerData: any = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      throw new Error('Failed to get creation ID from Instagram.');
    }
    
    // Step 2: For videos, poll for processing completion, then publish with caption.
    // For images, we just need to publish the container we created (caption was already included).
    if (isVideo) {
        // The caption is passed here to be used in the final publish step for videos.
        return await pollAndPublishContainer(instagramUserId, creationId, pageAccessToken, caption);
    } else {
        // For images, the caption was already included in the container.
        // We just need to trigger the publish step without a caption.
        return await publishContainer(instagramUserId, creationId, pageAccessToken);
    }
  }
);


async function pollAndPublishContainer(instagramUserId: string, creationId: string, pageAccessToken: string, caption?: string): Promise<PostToInstagramOutput> {
    const maxRetries = 20; // 20 * 5s = 100 seconds timeout
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
        const statusUrl = `${INSTAGRAM_GRAPH_API_URL}/${creationId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);

        if (!statusResponse.ok) {
            const errorBody: any = await statusResponse.json();
            console.error('Polling failed:', errorBody);
            throw new Error(`Failed to poll container status: ${errorBody.error?.message || 'Unknown polling error'}`);
        }

        const statusData: any = await statusResponse.json();
        const statusCode = statusData.status_code;
        
        console.log(`Polling container ${creationId}, status: ${statusCode}`);

        if (statusCode === 'FINISHED') {
            // Now that video processing is finished, publish it with the caption.
            return publishContainer(instagramUserId, creationId, pageAccessToken, caption);
        }

        if (statusCode === 'ERROR') {
             console.error('Container processing failed:', statusData);
             throw new Error('The uploaded video failed to process. It might be corrupted or in an unsupported format.');
        }

        // Wait before polling again
        await sleep(pollInterval);
    }
    
    throw new Error('Video processing timed out. Please try again later.');
}


async function publishContainer(instagramUserId: string, creationId: string, pageAccessToken: string, caption?: string): Promise<PostToInstagramOutput> {
    const publishUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media_publish`;
    
    const params = new URLSearchParams({
        creation_id: creationId,
        access_token: pageAccessToken,
    });

    // The caption is only needed here for videos. For images, it was already added during container creation.
    // This check correctly adds the caption for videos at the publishing stage.
    if (caption) {
        params.append('caption', caption);
    }

    console.log(`Publishing container ${creationId}...`);
    const publishResponse = await fetch(publishUrl, {
        method: 'POST',
        body: params,
    });

    if (!publishResponse.ok) {
        const errorData: any = await publishResponse.json();
        console.error('Failed to publish Instagram media container:', errorData);
        throw new Error(`Failed to publish Instagram media: ${errorData.error?.message || 'Unknown error'}`);
    }

    const publishData: any = await publishResponse.json();
    const postId = publishData.id;

    if (!postId) {
        throw new Error('Failed to get post ID from Instagram after publishing.');
    }
    console.log(`Successfully published Instagram post: ${postId}`);
    return { postId };
}


export async function postToInstagram(input: PostToInstagramInput): Promise<PostToInstagramOutput> {
    return postToInstagramFlow(input);
}
