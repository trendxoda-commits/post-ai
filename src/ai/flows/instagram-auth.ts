'use server';

/**
 * @fileOverview Instagram Authentication Flow
 * This file contains Genkit flows for handling Instagram Basic Display API OAuth2 authentication.
 * - getInstagramAuthUrl - Generates a URL for the user to grant access.
 * - getAccessToken - Exchanges an auth code for a short-lived access token.
 * - exchangeForLongLivedToken - Exchanges a short-lived token for a long-lived one.
 * - getIgUserDetails - Fetches user profile details (id, username) using a long-lived token.
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
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_content_publish,instagram_manage_insights,business_management',
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

export async function getAccessToken(input: GetInstagramAccessTokenInput): Promise<GetInstagramAccessTokenOutput> {
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

const SocialAccountDetailsSchema = z.object({
  platform: z.enum(['Instagram', 'Facebook']),
  accountId: z.string(),
  displayName: z.string(),
  pageAccessToken: z.string().optional(),
  avatar: z.string().url().optional(),
});

const GetInstagramUserDetailsInputSchema = z.object({
    accessToken: z.string(), // This should be the long-lived user token
});
export type GetInstagramUserDetailsInput = z.infer<typeof GetInstagramUserDetailsInputSchema>;

const GetInstagramUserDetailsOutputSchema = z.object({
  accounts: z.array(SocialAccountDetailsSchema),
});
export type GetInstagramUserDetailsOutput = z.infer<typeof GetInstagramUserDetailsOutputSchema>;


const getInstagramUserDetailsFlow = ai.defineFlow({
    name: 'getInstagramUserDetailsFlow',
    inputSchema: GetInstagramUserDetailsInputSchema,
    outputSchema: GetInstagramUserDetailsOutputSchema,
}, async ({ accessToken }) => {
    
    // Step 1: Get the user's Facebook Pages that they have granted permission for.
    const pagesUrl = `https://graph.facebook.com/me/accounts?fields=instagram_business_account,name,access_token,picture.type(large)&access_token=${accessToken}`;
    const pagesResponse = await fetch(pagesUrl);

    if (!pagesResponse.ok) {
        const errorData : any = await pagesResponse.json();
        console.error("Error fetching pages:", errorData);
        throw new Error(`Failed to fetch Facebook pages: ${errorData.error?.message || 'An active access token must be used.'}`);
    }
    const pagesData: any = await pagesResponse.json();
    
    if (!pagesData.data || pagesData.data.length === 0) {
        return { accounts: [] };
    }
    
    const allFoundAccounts: z.infer<typeof SocialAccountDetailsSchema>[] = [];
    
    for (const page of pagesData.data) {
        const hasIgAccount = !!page.instagram_business_account;

        if (hasIgAccount) {
            const instagramBusinessAccountId = page.instagram_business_account.id;
            try {
                // Fetch IG account details using the main user access token
                const igUrl = `https://graph.facebook.com/v20.0/${instagramBusinessAccountId}?fields=username,name,profile_picture_url&access_token=${accessToken}`;
                const igResponse = await fetch(igUrl);
                if (igResponse.ok) {
                    const igData: any = await igResponse.json();
                    allFoundAccounts.push({
                        platform: 'Instagram',
                        accountId: instagramBusinessAccountId,
                        displayName: igData.username || igData.name,
                        pageAccessToken: page.access_token, // The Page Access Token is needed for IG posting
                        avatar: igData.profile_picture_url,
                    });
                } else {
                     console.error(`Could not fetch details for IG account ${instagramBusinessAccountId}:`, await igResponse.text());
                }
            } catch (e) {
                 console.error(`Error processing IG account ${instagramBusinessAccountId}:`, e);
            }
        } else {
            // If the page is NOT connected to an IG account, add it as a Facebook account
             allFoundAccounts.push({
                platform: 'Facebook',
                accountId: page.id,
                displayName: page.name,
                pageAccessToken: page.access_token,
                avatar: page.picture?.data?.url,
            });
        }
    }
    
    return { accounts: allFoundAccounts };
});

export async function getIgUserDetails(input: GetInstagramUserDetailsInput): Promise<GetInstagramUserDetailsOutput> {
    return getInstagramUserDetailsFlow(input);
}
