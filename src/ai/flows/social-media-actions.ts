'use server';

/**
 * @fileOverview Social Media Actions Flow
 * This file contains Genkit flows for fetching data from social media platforms.
 * - getInstagramMedia - Fetches recent media from an Instagram account.
 * - getFacebookPosts - Fetches recent posts from a Facebook Page.
 * - getAccountAnalytics - Fetches comprehensive analytics for a single social media account.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// #################### Get Account Analytics Flow ####################

const GetAccountAnalyticsInputSchema = z.object({
    accountId: z.string().describe("The unique platform-specific ID for the account (Instagram ID or Facebook Page ID)."),
    platform: z.enum(["Instagram", "Facebook"]),
    accessToken: z.string().describe("The relevant access token (User Token for IG, Page Token for FB)."),
});
export type GetAccountAnalyticsInput = z.infer<typeof GetAccountAnalyticsInputSchema>;


const AnalyticsOutputSchema = z.object({
    followers: z.number(),
    totalLikes: z.number(),
    totalComments: z.number(),
    totalViews: z.number(),
    postCount: z.number(),
});
export type AnalyticsOutput = z.infer<typeof AnalyticsOutputSchema>;


const getAccountAnalyticsFlow = ai.defineFlow(
    {
        name: 'getAccountAnalyticsFlow',
        inputSchema: GetAccountAnalyticsInputSchema,
        outputSchema: AnalyticsOutputSchema,
    },
    async ({ accountId, platform, accessToken }) => {
        let followers = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalViews = 0;
        let postCount = 0;

        if (platform === 'Instagram') {
            // Batch API call for Instagram
            const batchParams = [
                {
                    method: 'GET',
                    relative_url: `${accountId}?fields=followers_count`,
                },
                {
                    method: 'GET',
                    // For videos, 'plays' is available via insights. We get it with like_count and comments_count
                    relative_url: `${accountId}/media?fields=like_count,comments_count,media_type,insights.metric(plays)&limit=25`,
                }
            ];

            const batchResponse = await fetch(INSTAGRAM_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: accessToken,
                    batch: batchParams,
                }),
            });
            
            if (!batchResponse.ok) {
                 const errorData: any = await batchResponse.json();
                 throw new Error(`Instagram batch request failed: ${errorData.error?.message || 'Unknown error'}`);
            }

            const batchResult: any[] = await batchResponse.json();
            
            // Process followers count response
            const followersResponse = JSON.parse(batchResult[0].body);
            if (batchResult[0].code === 200) {
                followers = followersResponse.followers_count || 0;
            }

            // Process media response
            const mediaResponse = JSON.parse(batchResult[1].body);
            if (batchResult[1].code === 200 && mediaResponse.data) {
                postCount = mediaResponse.data.length;
                mediaResponse.data.forEach((post: any) => {
                    totalLikes += post.like_count || 0;
                    totalComments += post.comments_count || 0;
                    if (post.media_type === 'VIDEO' && post.insights?.data) {
                        const playsInsight = post.insights.data.find((d: any) => d.name === 'plays');
                        totalViews += playsInsight?.values[0]?.value || 0;
                    }
                });
            }

        } else if (platform === 'Facebook') {
            // Batch API call for Facebook
             const batchParams = [
                {
                    method: 'GET',
                    relative_url: `${accountId}?fields=followers_count`,
                },
                {
                    method: 'GET',
                    // Note: Facebook video views are harder to get in a simple batch and often require video-specific calls.
                    // We will focus on likes and comments for FB for now.
                    relative_url: `${accountId}/posts?fields=likes.summary(true),comments.summary(true)&limit=25`,
                }
            ];

            const batchResponse = await fetch(INSTAGRAM_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: accessToken,
                    batch: batchParams,
                }),
            });

            if (!batchResponse.ok) {
                 const errorData: any = await batchResponse.json();
                 throw new Error(`Facebook batch request failed: ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const batchResult: any[] = await batchResponse.json();

            // Process followers count response
            const followersResponse = JSON.parse(batchResult[0].body);
            if (batchResult[0].code === 200) {
                followers = followersResponse.followers_count || 0;
            }

            // Process posts response
            const postsResponse = JSON.parse(batchResult[1].body);
             if (batchResult[1].code === 200 && postsResponse.data) {
                const postsWithStats = postsResponse.data.filter((p: any) => p.likes);
                postCount = postsWithStats.length;
                postsWithStats.forEach((post: any) => {
                    totalLikes += post.likes?.summary.total_count || 0;
                    totalComments += post.comments?.summary.total_count || 0;
                });
            }
        }

        return {
            followers,
            totalLikes,
            totalComments,
            totalViews,
            postCount,
        };
    }
);

export async function getAccountAnalytics(input: GetAccountAnalyticsInput): Promise<AnalyticsOutput> {
    return getAccountAnalyticsFlow(input);
}


// #################### Get Instagram Media Flow (Legacy - for feed) ####################

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

export type GetInstagramMediaOutput = z.infer<typeof GetInstagramMediaOutputSchema>;


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

export async function getInstagramMedia(input: z.infer<typeof GetInstagramMediaInputSchema>): Promise<GetInstagramMediaOutput> {
    return getInstagramMediaFlow(input);
}


// #################### Get Facebook Posts Flow (Legacy - for feed) ####################

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
export type GetFacebookPostsOutput = z.infer<typeof GetFacebookPostsOutputSchema>;


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

export async function getFacebookPosts(input: z.infer<typeof GetFacebookPostsInputSchema>): Promise<GetFacebookPostsOutput> {
    return getFacebookPostsFlow(input);
}
