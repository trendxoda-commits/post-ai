

'use server';

/**
 * @fileOverview Social Media Actions Flow
 * This file contains Genkit flows for fetching data from social media platforms.
 * - getInstagramMedia - Fetches recent media from an Instagram account.
 * - getFacebookPosts - Fetches recent posts from a Facebook Page.
 * - getAccountAnalytics - Fetches comprehensive analytics for a single social media account.
 * - getInstagramComments - Fetches comments for a specific Instagram post.
 * - getFacebookComments - Fetches comments for a specific Facebook post.
 * - replyToInstagramComment - Replies to a specific Instagram comment.
 * - replyToFacebookComment - Replies to a specific Facebook comment.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// #################### Get Account Analytics Flow ####################

const GetAccountAnalyticsInputSchema = z.object({
    accountId: z.string().describe("The unique platform-specific ID for the account (Instagram ID or Facebook Page ID)."),
    platform: z.enum(["Instagram", "Facebook"]),
    pageAccessToken: z.string().describe("The relevant PAGE access token, always required for page-level data and actions."),
    userAccessToken: z.string().describe("The main USER access token, required for fetching IG media insights and other user-level data."),
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
        outputSchema: AnalyticsOutputSchema,
        inputSchema: GetAccountAnalyticsInputSchema,
    },
    async ({ accountId, platform, pageAccessToken, userAccessToken }) => {
        let followers = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let totalViews = 0;
        let postCount = 0;

        // Step 1: Get followers count (always uses Page Access Token for both)
        const followersUrl = `${INSTAGRAM_GRAPH_API_URL}/${accountId}?fields=followers_count&access_token=${pageAccessToken}`;
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
                if (!userAccessToken) throw new Error("User access token is required for Instagram analytics.");
                
                // Pass the correct userAccessToken to get media and its insights
                const { media } = await getInstagramMedia({ instagramUserId: accountId, accessToken: userAccessToken });
                
                postCount = media.length;
                media.forEach(post => {
                    totalLikes += post.like_count || 0;
                    totalComments += post.comments_count || 0;
                    // Correctly aggregate views/plays for videos
                    totalViews += post.video_views || 0;
                });
            } catch (e) {
                console.error(`Error fetching Instagram media for analytics for ${accountId}:`, e);
            }
        } else if (platform === 'Facebook') {
             try {
                if (!pageAccessToken) throw new Error("Page access token is required for Facebook analytics.");

                // Pass the correct pageAccessToken to get posts and insights
                const { posts } = await getFacebookPosts({ facebookPageId: accountId, pageAccessToken: pageAccessToken });
                
                postCount = posts.length;
                posts.forEach(post => {
                    totalLikes += post.likes?.summary.total_count || 0;
                    totalComments += post.comments?.summary.total_count || 0;
                    // Correctly aggregate video views fetched from the individual post insights
                    totalViews += post.insights?.post_video_views || 0;
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
  // CRITICAL: This MUST be the main USER access token, not the page token.
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
    video_views: z.number().optional(), // Standardized field for all video types
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
    const fields = 'id,caption,media_type,media_url,permalink,timestamp';
    const url = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media?fields=${fields}&access_token=${accessToken}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData: any = await response.json();
      console.error('Failed to get Instagram media:', errorData);
      throw new Error(`Failed to get Instagram media: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: any = await response.json();
    
    const processedMediaPromises = (data.data || []).map(async (item: any) => {
        let views = 0;
        let likes = 0;
        let comments = 0;
        
        try {
            const insightMetrics = 'reach,likes,comments,saved,shares';
            // CRITICAL FIX: Always use the USER 'accessToken' for insights.
            const insightsUrl = `${INSTAGRAM_GRAPH_API_URL}/${item.id}/insights?metric=${insightMetrics}&period=lifetime&access_token=${accessToken}`;
            const insightsResponse = await fetch(insightsUrl);
            
            if (insightsResponse.ok) {
                const insightsData: any = await insightsResponse.json();
                const insightsMap = new Map(insightsData.data.map((insight: any) => [insight.name, insight.values[0]?.value || 0]));
                
                // Use 'reach' as the definitive view count.
                views = insightsMap.get('reach') || 0;
                likes = insightsMap.get('likes') || 0;
                comments = insightsMap.get('comments') || 0;

            } else {
                console.warn(`Could not fetch insights for media ${item.id}:`, await insightsResponse.text());
            }
        } catch (e) {
             console.warn(`Error fetching insights for media ${item.id}:`, e);
        }

        return {
            ...item,
            video_views: views, // Standardize on one field name for views
            like_count: likes,
            comments_count: comments,
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
  // CRITICAL: This MUST be the PAGE access token.
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
    insights: z.object({
        post_video_views: z.number()
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
    // Step 1: Get the basic post data
    const fields = 'id,message,created_time,permalink_url,attachments{media,type,url},likes.summary(true),comments.summary(true)';
    const url = `${INSTAGRAM_GRAPH_API_URL}/${facebookPageId}/posts?fields=${fields}&access_token=${pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorData: any = await response.json();
      console.error('Failed to get Facebook posts:', errorData);
      throw new Error(`Failed to get Facebook posts: ${errorData.error?.message || 'Unknown error'}`);
    }
    const data: any = await response.json();
    const posts = data.data || [];

    // Step 2: For each video post, fetch its views separately
    const postsWithInsights = await Promise.all(posts.map(async (post: any) => {
        const isVideo = post.attachments?.data[0]?.type?.includes('video');
        if (isVideo) {
            try {
                // CRITICAL FIX: Fetch insights for each video post individually using the correct pageAccessToken.
                const insightsUrl = `${INSTAGRAM_GRAPH_API_URL}/${post.id}/insights?metric=post_video_views&access_token=${pageAccessToken}`;
                const insightsResponse = await fetch(insightsUrl);
                if (insightsResponse.ok) {
                    const insightsData: any = await insightsResponse.json();
                    const views = insightsData.data?.find((d: any) => d.name === 'post_video_views')?.values[0]?.value || 0;
                    // DECISIVE FIX: Do not spread the whole post object again, only add the insights.
                    return { ...post, insights: { post_video_views: views } };
                }
            } catch (e) {
                console.warn(`Could not fetch views for FB post ${post.id}`, e);
            }
        }
        return post; // Return post as-is if not a video or if insights fail
    }));

    return { posts: postsWithInsights };
  }
);

export async function getFacebookPosts(input: z.infer<typeof GetFacebookPostsInputSchema>): Promise<GetFacebookPostsOutput> {
    return getFacebookPostsFlow(input);
}


// #################### Get Comments Flows ####################

const CommentObjectSchema = z.object({
  id: z.string(),
  text: z.string(),
  timestamp: z.string(),
  from: z.object({
    id: z.string(),
    username: z.string(),
  }),
  is_hidden: z.boolean().optional(),
});

const GetCommentsInputSchema = z.object({
  mediaId: z.string().describe("The ID of the Instagram media or Facebook post."),
  accessToken: z.string().describe("The Page Access Token for the account."),
});
export type GetCommentsInput = z.infer<typeof GetCommentsInputSchema>;

const GetCommentsOutputSchema = z.object({
  comments: z.array(CommentObjectSchema),
});
export type GetCommentsOutput = z.infer<typeof GetCommentsOutputSchema>;

const getInstagramCommentsFlow = ai.defineFlow({
    name: 'getInstagramCommentsFlow',
    inputSchema: GetCommentsInputSchema,
    outputSchema: GetCommentsOutputSchema,
}, async ({ mediaId, accessToken }) => {
    const url = `${INSTAGRAM_GRAPH_API_URL}/${mediaId}/comments?fields=id,text,timestamp,from,username,is_hidden&access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Failed to fetch Instagram comments: ${errorData.error?.message}`);
    }
    const data: any = await response.json();
    return { comments: data.data || [] };
});

const getFacebookCommentsFlow = ai.defineFlow({
    name: 'getFacebookCommentsFlow',
    inputSchema: GetCommentsInputSchema,
    outputSchema: GetCommentsOutputSchema,
}, async ({ mediaId, accessToken }) => {
    const url = `${INSTAGRAM_GRAPH_API_URL}/${mediaId}/comments?fields=id,message,created_time,from,is_hidden&access_token=${accessToken}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Failed to fetch Facebook comments: ${errorData.error?.message}`);
    }
    const data: any = await response.json();
    // Adapt FB response to our standard CommentObjectSchema
    const adaptedComments = (data.data || []).map((c: any) => ({
        id: c.id,
        text: c.message,
        timestamp: c.created_time,
        from: { id: c.from.id, username: c.from.name },
        is_hidden: c.is_hidden,
    }));
    return { comments: adaptedComments };
});

export async function getInstagramComments(input: GetCommentsInput): Promise<GetCommentsOutput> {
    return getInstagramCommentsFlow(input);
}
export async function getFacebookComments(input: GetCommentsInput): Promise<GetCommentsOutput> {
    return getFacebookCommentsFlow(input);
}


// #################### Reply to Comment Flows ####################

const ReplyToCommentInputSchema = z.object({
  commentId: z.string().describe("The ID of the comment to reply to."),
  message: z.string().describe("The reply message text."),
  accessToken: z.string().describe("The Page Access Token for the account."),
});
export type ReplyToCommentInput = z.infer<typeof ReplyToCommentInputSchema>;

const ReplyToCommentOutputSchema = z.object({
  success: z.boolean(),
  replyId: z.string().optional(),
});
export type ReplyToCommentOutput = z.infer<typeof ReplyToCommentOutputSchema>;


const replyToInstagramCommentFlow = ai.defineFlow({
    name: 'replyToInstagramCommentFlow',
    inputSchema: ReplyToCommentInputSchema,
    outputSchema: ReplyToCommentOutputSchema,
}, async ({ commentId, message, accessToken }) => {
    const url = `${INSTAGRAM_GRAPH_API_URL}/${commentId}/replies`;
    const params = new URLSearchParams({
        message: message,
        access_token: accessToken,
    });
    const response = await fetch(url, { method: 'POST', body: params });
    if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Failed to reply to Instagram comment: ${errorData.error?.message}`);
    }
    const data: any = await response.json();
    return { success: true, replyId: data.id };
});

const replyToFacebookCommentFlow = ai.defineFlow({
    name: 'replyToFacebookCommentFlow',
    inputSchema: ReplyToCommentInputSchema,
    outputSchema: ReplyToCommentOutputSchema,
}, async ({ commentId, message, accessToken }) => {
    const url = `${INSTAGRAM_GRAPH_API_URL}/${commentId}/comments`;
    const params = new URLSearchParams({
        message: message,
        access_token: accessToken,
    });
    const response = await fetch(url, { method: 'POST', body: params });
     if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Failed to reply to Facebook comment: ${errorData.error?.message}`);
    }
    const data: any = await response.json();
    return { success: true, replyId: data.id };
});


export async function replyToInstagramComment(input: ReplyToCommentInput): Promise<ReplyToCommentOutput> {
    return replyToInstagramCommentFlow(input);
}

export async function replyToFacebookComment(input: ReplyToCommentInput): Promise<ReplyToCommentOutput> {
    return replyToFacebookCommentFlow(input);
}
