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
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

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
    // This flow now correctly uses the NEXT_PUBLIC_ prefixed variables, as it's initiated from the client-side context.
    if (!process.env.NEXT_PUBLIC_URL || !process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI) {
        throw new Error('NEXT_PUBLIC_URL or NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI is not set in the .env file. The app owner needs to configure this.');
    }
    const redirectUri = `${process.env.NEXT_PUBLIC_URL}${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'instagram_basic,pages_show_list,instagram_content_publish,pages_manage_posts,pages_read_engagement',
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
    redirectUri: z.string().url(),
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
}, async ({ code, clientId, clientSecret, redirectUri }) => {
    
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

const GetInstagramUserDetailsOutputSchema = z.object({
    username: z.string(),
    instagramId: z.string().optional(),
    facebookPageId: z.string().optional(),
    facebookPageName: z.string().optional(),
    pageAccessToken: z.string().optional(),
});
export type GetInstagramUserDetailsOutput = z.infer<typeof GetInstagramUserDetailsOutputSchema>;

const getInstagramUserDetailsFlow = ai.defineFlow({
    name: 'getInstagramUserDetailsFlow',
    inputSchema: GetInstagramUserDetailsInputSchema,
    outputSchema: GetInstagramUserDetailsOutputSchema,
}, async ({ accessToken }) => {
    
    // Step 1: Get the user's Facebook Pages that they have granted permission for.
    const pagesUrl = `https://graph.facebook.com/me/accounts?fields=instagram_business_account,name,access_token&access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
        const errorData : any = await pagesResponse.json();
        throw new Error(`Failed to fetch Facebook pages: ${errorData.error?.message || 'An active access token must be used.'}`);
    }
    const pagesData: any = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error('No Facebook Page linked to this account. Please go to Facebook Business settings and link a Page with an Instagram Business account.');
    }
    
    // Step 2: Find the first page that has an Instagram Business Account linked.
    const pageWithIg = pagesData.data.find((page: any) => page.instagram_business_account);

    if (!pageWithIg) {
        // Fallback to basic display API if no business account is linked
        const basicUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`;
        const basicResponse = await fetch(basicUrl);
        if (!basicResponse.ok) {
             const errorData: any = await basicResponse.json();
            throw new Error(`Failed to get Instagram user details: ${errorData.error?.message || 'Unknown error'}`);
        }
        const basicData: any = await basicResponse.json();
        return {
            username: basicData.username,
            instagramId: basicData.id
        }
    }

    const instagramBusinessAccountId = pageWithIg.instagram_business_account.id;
    const facebookPageId = pageWithIg.id;
    const facebookPageName = pageWithIg.name;
    const pageAccessToken = pageWithIg.access_token; // This is the Page Access Token we need

    if (!pageAccessToken) {
        throw new Error('Could not retrieve Page Access Token for the linked page.');
    }

    // Step 3: Use the Instagram Business Account ID to get the username.
    const igUrl = `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}?fields=username&access_token=${accessToken}`;
    const igResponse = await fetch(igUrl);

    if (!igResponse.ok) {
        const errorData: any = await igResponse.json();
        console.error('Failed to get Instagram user details:', errorData);
        throw new Error(`Failed to get Instagram user details: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data: any = await igResponse.json();
    
    return { 
        username: data.username, 
        instagramId: instagramBusinessAccountId, 
        facebookPageId: facebookPageId, 
        facebookPageName: facebookPageName,
        pageAccessToken: pageAccessToken, // Return the page access token
    };
});

export async function getInstagramUserDetails(input: GetInstagramUserDetailsInput): Promise<GetInstagramUserDetailsOutput> {
    return getInstagramUserDetailsFlow(input);
}