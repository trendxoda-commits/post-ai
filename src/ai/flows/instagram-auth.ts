'use server';

/**
 * @fileOverview Instagram Authentication Flow
 * This file contains Genkit flows for handling Instagram Basic Display API OAuth2 authentication.
 * - getInstagramAuthUrl - Generates a URL for the user to grant access.
 * - getInstagramAccessToken - Exchanges an auth code for a short-lived access token.
 * - exchangeForLongLivedToken - Exchanges a short-lived token for a long-lived one.
 * - getInstagramUserDetails - Fetches user profile details (id, username) using a long-lived token.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { URLSearchParams } from 'url';
import crypto from 'crypto';

// Helper to construct the redirect URI consistently
const getRedirectUri = () => {
    if (!process.env.NEXT_PUBLIC_URL || !process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI) {
        throw new Error('NEXT_PUBLIC_URL or NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI is not set in the .env file. The app owner needs to configure this.');
    }
    // Clean up potential double slashes
    const baseUrl = process.env.NEXT_PUBLIC_URL.endsWith('/') ? process.env.NEXT_PUBLIC_URL.slice(0, -1) : process.env.NEXT_PUBLIC_URL;
    const path = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI.startsWith('/') ? process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI : '/' + process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI;
    return `${baseUrl}${path}`;
}


// #################### Get Auth URL Flow ####################
const GetInstagramAuthUrlInputSchema = z.object({
  clientId: z.string(),
  userId: z.string().describe("The UID of the user initiating the connection."),
});
export type GetInstagramAuthUrlInput = z.infer<typeof GetInstagramAuthUrlInputSchema>;

const GetInstagramAuthUrlOutputSchema = z.object({
  url: z.string().url().describe('The URL to redirect the user to for authentication.'),
});
export type GetInstagramAuthUrlOutput = z.infer<typeof GetInstagramAuthUrlOutputSchema>;

const getInstagramAuthUrlFlow = ai.defineFlow(
  {
    name: 'getInstagramAuthUrlFlow',
    inputSchema: GetInstagramAuthUrlInputSchema,
    outputSchema: GetInstagramAuthUrlOutputSchema,
  },
  async ({ clientId, userId }) => {
    const redirectUri = getRedirectUri();
    
    // Request only the most basic permission to ensure login works without advanced access.
    const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'instagram_content_publish',
        'pages_manage_posts',
        'instagram_manage_insights',
    ];

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes.join(','),
        response_type: 'code',
        state: userId, // Pass the user's UID in the state parameter for security
    });
    const url = `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
    return { url };
  }
);

export async function getInstagramAuthUrl(input: GetInstagramAuthUrlInput): Promise<GetInstagramAuthUrlOutput> {
  return getInstagramAuthUrlFlow(input);
}


// #################### Get Access Token Flow ####################

const GetInstagramAccessTokenInputSchema = z.object({
    code: z.string().describe('The authorization code from the redirect.'),
    clientId: z.string(),
    clientSecret: z.string(),
});
export type GetInstagramAccessTokenInput = z.infer<typeof GetInstagramAccessTokenInputSchema>;

const GetInstagramAccessTokenOutputSchema = z.object({
    accessToken: z.string(),
});
export type GetInstagramAccessTokenOutput = z.infer<typeof GetInstagramAccessTokenOutputSchema>;


const getInstagramAccessTokenFlow = ai.defineFlow({
    name: 'getInstagramAccessTokenFlow',
    inputSchema: GetInstagramAccessTokenInputSchema,
    outputSchema: GetInstagramAccessTokenOutputSchema,
}, async ({ code, clientId, clientSecret }) => {
    const redirectUri = getRedirectUri();

    const url = `https://graph.facebook.com/v20.0/oauth/access_token`;
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
    });

    const response = await fetch(url, {
        method: 'POST',
        body: params,
    });

    if (!response.ok) {
        const errorData: any = await response.json();
        console.error('Failed to get Instagram access token:', errorData);
        throw new Error(`Failed to get access token: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: any = await response.json();
    if (!data.access_token) {
        throw new Error('Access Token not found in the response from Facebook.');
    }
    
    return { accessToken: data.access_token };
});

export async function getInstagramAccessToken(input: GetInstagramAccessTokenInput): Promise<GetInstagramAccessTokenOutput> {
    return getInstagramAccessTokenFlow(input);
}


// #################### Exchange for Long-Lived Token Flow ####################
const ExchangeForLongLivedTokenInputSchema = z.object({
  shortLivedToken: z.string(),
  clientSecret: z.string(),
  clientId: z.string(),
});
export type ExchangeForLongLivedTokenInput = z.infer<typeof ExchangeForLongLivedTokenInputSchema>;

const ExchangeForLongLivedTokenOutputSchema = z.object({
  longLivedToken: z.string(),
});
export type ExchangeForLongLivedTokenOutput = z.infer<typeof ExchangeForLongLivedTokenOutputSchema>;


const exchangeForLongLivedTokenFlow = ai.defineFlow({
  name: 'exchangeForLongLivedTokenFlow',
  inputSchema: ExchangeForLongLivedTokenInputSchema,
  outputSchema: ExchangeForLongLivedTokenOutputSchema,
}, async ({ shortLivedToken, clientId, clientSecret }) => {
    const url = `https://graph.facebook.com/v20.0/oauth/access_token`;
    const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
        const errorData: any = await response.json();
        console.error('Failed to exchange for long-lived token:', errorData);
        throw new Error(`Failed to get long-lived token: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: any = await response.json();
    if (!data.access_token) {
        throw new Error('Long-Lived Access Token not found in the response from Facebook.');
    }
    
    return { longLivedToken: data.access_token };
});

export async function exchangeForLongLivedToken(input: ExchangeForLongLivedTokenInput): Promise<ExchangeForLongLivedTokenOutput> {
    return exchangeForLongLivedTokenFlow(input);
}


// #################### Get User Details Flow ####################

const GetInstagramUserDetailsInputSchema = z.object({
    accessToken: z.string(), // This should be the long-lived user token
});
export type GetInstagramUserDetailsInput = z.infer<typeof GetInstagramUserDetailsInputSchema>;

const PageDetailsSchema = z.object({
    username: z.string(),
    instagramId: z.string().optional(),
    facebookPageId: z.string().optional(),
    facebookPageName: z.string().optional(),
    pageAccessToken: z.string().optional(),
    platform: z.enum(['Instagram', 'Facebook']),
});

const GetInstagramUserDetailsOutputSchema = z.object({
    accounts: z.array(PageDetailsSchema)
});
export type GetInstagramUserDetailsOutput = z.infer<typeof GetInstagramUserDetailsOutputSchema>;

const getInstagramUserDetailsFlow = ai.defineFlow({
    name: 'getInstagramUserDetailsFlow',
    inputSchema: GetInstagramUserDetailsInputSchema,
    outputSchema: GetInstagramUserDetailsOutputSchema,
}, async ({ accessToken }) => {
    
    const pagesUrl = `https://graph.facebook.com/me/accounts?fields=instagram_business_account,name,access_token&access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);

    if (!pagesResponse.ok) {
        const errorData : any = await pagesResponse.json();
        throw new Error(`Failed to fetch Facebook pages: ${errorData.error?.message || 'An active access token must be used to query information about the current user.'}`);
    }
    
    const pagesData: any = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
        // If no pages are found, don't crash. Just return an empty list.
        // This is a valid scenario.
        return { accounts: [] };
    }
    
    const allFoundAccounts: z.infer<typeof PageDetailsSchema>[] = [];
    
    for (const page of pagesData.data) {
        // Each page is a potential Facebook account to be added.
        allFoundAccounts.push({
            username: page.name,
            facebookPageId: page.id,
            facebookPageName: page.name,
            pageAccessToken: page.access_token,
            platform: 'Facebook' as const,
        });

        // If a page has a linked IG account, create a separate record for it.
        if (page.instagram_business_account) {
            const instagramBusinessAccountId = page.instagram_business_account.id;
            
            // Use the PAGE access token for IG queries, as it's often required.
            const igUrl = `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}?fields=username&access_token=${page.access_token}`;
            
            try {
                const igResponse = await fetch(igUrl);
                if (igResponse.ok) {
                    const igData: any = await igResponse.json();
                    allFoundAccounts.push({
                        username: igData.username,
                        instagramId: instagramBusinessAccountId,
                        facebookPageId: page.id, // Keep track of the parent page
                        pageAccessToken: page.access_token, // The page token is needed for IG posting too
                        platform: 'Instagram' as const,
                    });
                } else {
                    const igError: any = await igResponse.json();
                    console.warn(`Could not fetch username for IG account ${instagramBusinessAccountId}. It might be a permission issue. Error: ${igError.error?.message}`);
                }
            } catch (e) {
                console.error(`Error fetching IG account details for ${instagramBusinessAccountId}:`, e);
            }
        }
    }
    
    if (allFoundAccounts.length === 0) {
        // This can happen if the user granted permissions but has no eligible pages/accounts.
        console.log('No Facebook Page or Instagram Business Account could be processed.');
    }

    return { accounts: allFoundAccounts };
});

export async function getInstagramUserDetails(input: GetInstagramUserDetailsInput): Promise<GetInstagramUserDetailsOutput> {
    return getInstagramUserDetailsFlow(input);
}
