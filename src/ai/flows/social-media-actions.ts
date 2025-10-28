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
import fetch from 'node-fetch';

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

        // Step 1: Get followers count
        const followersUrl = `${INSTAGRAM_GRAPH_API_URL}/${accountId}?fields=followers_count&access_token=${accessToken}`;
        try {
            const followersResponse = await fetch(followersUrl);
            if (followersResponse.ok) {
                const followersData: any = await followersResponse.json();
                followers = followersData.followers_count || 0;
            } else {
                 console.error(`Failed to fetch followers for ${accountId}:`, await followersResponse.text());
            }
        } catch (e) {
            console.error(`Error fetching followers for ${accountId}:`, e);
        }

        // Step 2: Get posts and aggregate stats from them
        if (platform === 'Instagram') {
            try {
                // For Instagram, we need the user access token to fetch media
                const { media } = await getInstagramMedia({ instagramUserId: accountId, accessToken });
                postCount = media.length;
                media.forEach(post => {
                    totalLikes += post.like_count || 0;
                    totalComments += post.comments_count || 0;
                    // 'plays' is only available for VIDEO type and is fetched inside getInstagramMedia
                    if (post.media_type === 'VIDEO') {
                        totalViews += post.plays || 0;
                    }
                });
            } catch (e) {
                console.error(`Error fetching Instagram media for analytics for ${accountId}:`, e);
            }
        } else if (platform === 'Facebook') {
            try {
                // For Facebook, we need the page access token
                const { posts } = await getFacebookPosts({ facebookPageId: accountId, pageAccessToken: accessToken });
                postCount = posts.length;
                 posts.forEach(post => {
                    totalLikes += post.likes?.summary.total_count || 0;
                    totalComments += post.comments?.summary.total_count || 0;
                    if (post.insights?.data) {
                        const viewsInsight = post.insights.data.find((d: any) => d.name === 'post_video_views');
                        totalViews += viewsInsight?.values[0]?.value || 0;
                    }
                });
            } catch (e) {
                console.error(`Error fetching Facebook posts for analytics for ${accountId}:`, e);
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
    caption: z.string().optional().nullable(),
    media_type: z.string(),
    media_url: z.string().url(),
    permalink: z.string().url(),
    timestamp: z.string(),
    like_count: z.number().optional(),
    comments_count: z.number().optional(),
    plays: z.number().optional(), // Now explicitly part of the schema
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
        let plays = 0;
        
        // Insights for plays are only available for VIDEO
        if (item.media_type === 'VIDEO') {
            try {
                // NOTE: Insights require the USER access token, not the page token.
                const insightsUrl = `${INSTAGRAM_GRAPH_API_URL}/${item.id}/insights?metric=plays&access_token=${accessToken}`;
                const insightsResponse = await fetch(insightsUrl);
                if (insightsResponse.ok) {
                    const insightsData: any = await insightsResponse.json();
                    plays = insightsData.data?.find((insight: any) => insight.name === 'plays')?.values[0]?.value || 0;
                }
            } catch (e) {
                console.warn(`Could not fetch plays for media ${item.id}:`, e);
            }
        }

        return {
            ...item,
            plays: plays,
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
    message: z.string().optional().nullable(),
    created_time: z.string(),
    attachments: z.any().optional(), 
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
    // Added for video views
    insights: z.any().optional(),
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
    // Requesting attachments, source for videos, and the correct insights metric.
    const fields = 'id,message,created_time,permalink_url,attachments{media{source,image},type,url},likes.summary(true),comments.summary(true),insights.metric(post_video_views)';
    // CRITICAL FIX: Use the pageAccessToken for this call.
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
