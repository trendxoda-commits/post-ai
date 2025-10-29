'use server';

/**
 * @fileOverview Facebook Post Flow
 * This file contains a Genkit flow for posting an image or video to a Facebook Page.
 * - postToFacebook - Posts media to a user's Facebook Page.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const PostToFacebookInputSchema = z.object({
  facebookPageId: z.string().describe('The ID of the Facebook Page.'),
  mediaUrl: z.string().url().describe('The public URL of the media to post.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).describe('The type of media being posted.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with pages_manage_posts permission.'),
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
  async ({ facebookPageId, mediaUrl, mediaType, caption, pageAccessToken }) => {
    
    let postUrl: string;
    const params = new URLSearchParams({
        access_token: pageAccessToken,
    });

    if (mediaType === 'VIDEO') {
        postUrl = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/videos`;
        params.append('file_url', mediaUrl);
        if (caption) {
            params.append('description', caption);
        }
    } else { // IMAGE
        postUrl = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/photos`;
        params.append('url', mediaUrl);
        if (caption) {
            params.append('caption', caption);
        }
    }
    
    const response = await fetch(postUrl, {
        method: 'POST',
        body: params,
    });


    if (!response.ok) {
        const errorData: any = await response.json();
        console.error('Failed to post to Facebook:', errorData);
        const fbErrorMessage = errorData.error?.message || 'Unknown error';
        throw new Error(`Failed to post to Facebook: ${fbErrorMessage}`);
    }

    const responseData: any = await response.json();
    
    // The post ID can be in `post_id` for videos or `id` for photos.
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
