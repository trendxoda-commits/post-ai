'use server';

import {
  getTrendingHashtags,
  type TrendingHashtagsInput,
  type TrendingHashtagsOutput,
} from '@/ai/flows/trending-hashtag-suggestions';
import {
  getInstagramAuthUrl,
  getInstagramAccessToken,
  exchangeForLongLivedToken,
  getInstagramUserDetails,
  type GetInstagramAuthUrlInput,
  type GetInstagramAccessTokenInput,
  type ExchangeForLongLivedTokenInput,
  type GetInstagramUserDetailsInput,
  type GetInstagramUserDetailsOutput,
} from '@/ai/flows/instagram-auth';
import {
  postToInstagram as postToInstagramFlow,
  type PostToInstagramInput,
  type PostToInstagramOutput,
} from '@/ai/flows/post-to-instagram';
import {
  postToFacebook as postToFacebookFlow,
  type PostToFacebookInput,
  type PostToFacebookOutput,
} from '@/ai/flows/post-to-facebook';
import {
  getInstagramMedia as getInstagramMediaFlow,
  getFacebookPosts as getFacebookPostsFlow,
} from '@/ai/flows/social-media-actions';
import type { z } from 'zod';
import type {
  GetInstagramMediaInputSchema,
  GetInstagramMediaOutputSchema,
  GetFacebookPostsInputSchema,
  GetFacebookPostsOutputSchema,
} from '@/ai/flows/social-media-actions';

// --- Trending Hashtags ---
export async function generateHashtags(
  input: TrendingHashtagsInput
): Promise<TrendingHashtagsOutput> {
  return getTrendingHashtags(input);
}

// --- Instagram Auth ---
export async function getAuthUrl(input: GetInstagramAuthUrlInput) {
  return getInstagramAuthUrl(input);
}

export async function getAccessToken(input: GetInstagramAccessTokenInput) {
  return getInstagramAccessToken(input);
}

export async function getLongLivedToken(input: ExchangeForLongLivedTokenInput) {
  return exchangeForLongLivedToken(input);
}

export async function getIgUserDetails(
  input: GetInstagramUserDetailsInput
): Promise<GetInstagramUserDetailsOutput> {
  return getInstagramUserDetails(input);
}

// --- Social Media Posting ---

export async function postToInstagram(
  input: PostToInstagramInput
): Promise<PostToInstagramOutput> {
  return postToInstagramFlow(input);
}

export async function postToFacebook(
  input: PostToFacebookInput
): Promise<PostToFacebookOutput> {
  return postToFacebookFlow(input);
}

// --- Social Media Data Fetching ---
export async function fetchInstagramMedia(
  input: z.infer<typeof GetInstagramMediaInputSchema>
): Promise<z.infer<typeof GetInstagramMediaOutputSchema>> {
  return getInstagramMediaFlow(input);
}

export async function fetchFacebookPosts(
  input: z.infer<typeof GetFacebookPostsInputSchema>
): Promise<z.infer<typeof GetFacebookPostsOutputSchema>> {
  return getFacebookPostsFlow(input);
}
