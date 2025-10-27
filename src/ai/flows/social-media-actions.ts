'use server';

/**
 * @fileOverview Social Media Actions Flow
 * This file contains Genkit flows for fetching data from social media platforms.
 * - getInstagramMedia - Fetches recent media from an Instagram account.
 * - getFacebookPosts - Fetches recent posts from a Facebook Page.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// #################### Get Instagram Media Flow ####################

const GetInstagramMediaInputSchema = z.object({
  instagramUserId: z.string().describe('The Instagram User ID.'),
  accessToken: z.string().describe('The user access token.'),
});

const InstagramMediaObjectSchema = z.object({
    id: z.string(),
    caption: z.string().optional(),
    media_type: z.string(),
    media_url: z.string().url(),
    permalink: z.string().url(),
    timestamp: z.string(),
    like_count: z.number().optional(),
    comments_count: z.number().optional(),
    impressions: z.number().optional(),
});

const GetInstagramMediaOutputSchema = z.object({
  media: z.array(InstagramMediaObjectSchema),
});

const getInstagramMediaFlow = ai.defineFlow(
  {
    name: 'getInstagramMediaFlow',
    inputSchema: GetInstagramMediaInputSchema,
    outputSchema: GetInstagramMediaOutputSchema,
  },
  async ({ instagramUserId, accessToken }) => {
    // Request basic fields first. Insights will be fetched conditionally.
    const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';
    const url = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData: any = await response.json();
      console.error('Failed to get Instagram media:', errorData);
      throw new Error(`Failed to get Instagram media: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: any = await response.json();
    
    // Process each media item to conditionally fetch insights.
    const processedMediaPromises = (data.data || []).map(async (item: any) => {
        let impressions = 0;
        
        // Insights are only supported for IMAGE, VIDEO, CAROUSEL_ALBUM. Not for STORY.
        if (['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(item.media_type)) {
            try {
                const insightsUrl = `${INSTAGRAM_GRAPH_API_URL}/${item.id}/insights?metric=impressions&access_token=${accessToken}`;
                const insightsResponse = await fetch(insightsUrl);
                if (insightsResponse.ok) {
                    const insightsData: any = await insightsResponse.json();
                    impressions = insightsData.data?.find((insight: any) => insight.name === 'impressions')?.values[0]?.value || 0;
                }
            } catch (e) {
                console.warn(`Could not fetch impressions for media ${item.id}:`, e);
            }
        }

        return {
            ...item,
            impressions: impressions,
        };
    });

    const processedMedia = await Promise.all(processedMediaPromises);

    return { media: processedMedia || [] };
  }
);

export async function getInstagramMedia(input: z.infer<typeof GetInstagramMediaInputSchema>): Promise<z.infer<typeof GetInstagramMediaOutputSchema>> {
    return getInstagramMediaFlow(input);
}


// #################### Get Facebook Posts Flow ####################

const GetFacebookPostsInputSchema = z.object({
  facebookPageId: z.string().describe('The Facebook Page ID.'),
  pageAccessToken: z.string().describe('The Page Access Token.'),
});

const FacebookPostObjectSchema = z.object({
    id: z.string(),
    message: z.string().optional(),
    created_time: z.string(),
    full_picture: z.string().url().optional(),
    permalink_url: z.string().url(),
    likes: z.object({
        summary: z.object({
            total_count: z.number()
        })
    }).optional(),
    comments: z.object({
        summary: z.object({
            total_count: z.number()
        })
    }).optional(),
});

const GetFacebookPostsOutputSchema = z.object({
  posts: z.array(FacebookPostObjectSchema),
});


const getFacebookPostsFlow = ai.defineFlow(
  {
    name: 'getFacebookPostsFlow',
    inputSchema: GetFacebookPostsInputSchema,
    outputSchema: GetFacebookPostsOutputSchema,
  },
  async ({ facebookPageId, pageAccessToken }) => {
    const fields = 'id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true)';
    const url = `${INSTAGRAM_GRAPH_API_URL}/${facebookPageId}/posts?fields=${fields}&access_token=${pageAccessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData: any = await response.json();
      console.error('Failed to get Facebook posts:', errorData);
      throw new Error(`Failed to get Facebook posts: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: any = await response.json();
    return { posts: data.data || [] };
  }
);

export async function getFacebookPosts(input: z.infer<typeof GetFacebookPostsInputSchema>): Promise<z.infer<typeof GetFacebookPostsOutputSchema>> {
    return getFacebookPostsFlow(input);
}
