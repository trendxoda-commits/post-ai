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
