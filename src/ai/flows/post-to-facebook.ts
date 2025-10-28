'use server';

/**
 * @fileOverview Facebook Post Flow
 * This file contains a Genkit flow for posting an image to a Facebook Page.
 * - postToFacebook - Posts an image to a user's Facebook Page.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const PostToFacebookInputSchema = z.object({
  facebookPageId: z.string().describe('The ID of the Facebook Page.'),
  mediaUrl: z.string().url().describe('The public URL of the image to post.'),
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
  async ({ facebookPageId, mediaUrl, caption, pageAccessToken }) => {
    
    // Use the Page Access Token directly to post the photo.
    const postUrl = `${FACEBOOK_GRAPH_API_URL}/${facebookPageId}/photos`;
    
    const params = new URLSearchParams({
        url: mediaUrl,
        access_token: pageAccessToken, // Use the page access token here
    });

    if (caption) {
        params.append('caption', caption);
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