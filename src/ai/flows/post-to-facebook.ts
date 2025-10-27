'use server';

/**
 * @fileOverview Facebook Post Flow
 * This file contains a Genkit flow for posting an image or video to a Facebook Page.
 * - postToFacebook - Posts media to a user's Facebook Page.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const PostToFacebookInputSchema = z.object({
  facebookPageId: z.string().describe('The ID of the Facebook Page.'),
  mediaUrl: z.string().describe('The public URL of the image or video to post.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with pages_manage_posts permission.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
});
export type PostToFacebookInput = z.infer<typeof PostToFacebookInputSchema>;

const PostToFacebookOutputSchema = z.object({
  postId: z.string().describe('The ID of the created Facebook post.'),
});
export type PostToFacebookOutput = z.infer<typeof PostToFacebookOutputSchema>;

const FACEBOOK_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

const postToFacebookFlow = ai.defineFlow(
  {
    name: 'postToFacebookFlow',
    inputSchema: PostToFacebookInputSchema,
    outputSchema: PostToFacebookOutputSchema,
  },
  async ({ facebookPageId, mediaUrl, caption, pageAccessToken, mediaType }) => {
    
    const isVideo = mediaType === 'VIDEO';
    const postEndpoint = isVideo ? 'videos' : 'photos';
    const postUrl = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/${postEndpoint}`;
    
    const params = new URLSearchParams({
        access_token: pageAccessToken,
    });

    if (isVideo) {
        params.append('file_url', mediaUrl);
        if (caption) {
            params.append('description', caption);
        }
    } else {
        params.append('url', mediaUrl);
        if (caption) {
            params.append('message', caption);
        }
    }
    
    const response = await fetch(`${postUrl}?${params.toString()}`, {
        method: 'POST',
    });


    if (!response.ok) {
        const errorData: any = await response.json();
        console.error('Failed to post to Facebook:', errorData);
        const fbErrorMessage = errorData.error?.message || 'Unknown error';
        throw new Error(`Failed to post to Facebook: ${fbErrorMessage}`);
    }

    const responseData: any = await response.json();
    
    // For photos, the ID is `post_id`. For videos, it is `id`.
    const postId = responseData.post_id || responseData.id;
    if (!postId) {
        throw new Error('Failed to get post ID from Facebook after publishing.');
    }

    return { postId };
  }
);


export async function postToFacebook(input: PostToFacebookInput): Promise<PostToFacebookOutput> {
    return postToFacebookFlow(input);
}