
'use server';

import {
  getInstagramAuthUrl,
  getAccessToken as getAccessTokenFlow,
  exchangeForLongLivedToken,
  getIgUserDetails as getIgUserDetailsFlow,
  type GetInstagramAuthUrlInput,
  type GetInstagramAccessTokenInput,
  type ExchangeForLongLivedTokenInput,
  type GetInstagramUserDetailsOutput,
} from '@/ai/flows/instagram-auth';
import {
  postToInstagram as postToInstagramFlow,
  type PostToInstagramInput,
} from '@/ai/flows/post-to-instagram';
import {
  postToFacebook as postToFacebookFlow,
  type PostToFacebookInput,
} from '@/ai/flows/post-to-facebook';
import {
  getInstagramMedia as getInstagramMediaFlow,
  getFacebookPosts as getFacebookPostsFlow,
  getAccountAnalytics as getAccountAnalyticsFlow,
  type GetInstagramMediaOutput,
  type GetFacebookPostsOutput,
  type GetAccountAnalyticsInput,
  type AnalyticsOutput,
} from '@/ai/flows/social-media-actions';
import {
    validateToken as validateTokenFlow,
    type ValidateTokenInput,
    type ValidateTokenOutput,
} from '@/ai/flows/validate-token';
import {
  scheduleInstagramPost as scheduleInstagramPostFlow,
  type ScheduleInstagramPostInput,
} from '@/ai/flows/schedule-instagram-post';
import {
  scheduleFacebookPost as scheduleFacebookPostFlow,
  type ScheduleFacebookPostInput,
} from '@/ai/flows/schedule-facebook-post';


// --- Instagram Auth ---
export async function getAuthUrl(input: GetInstagramAuthUrlInput) {
  return getInstagramAuthUrl(input);
}

export async function getAccessToken(input: GetInstagramAccessTokenInput) {
  return getAccessTokenFlow(input);
}

export async function getLongLivedToken(input: ExchangeForLongLivedTokenInput) {
  return exchangeForLongLivedToken(input);
}

export async function getIgUserDetails(
  input: any
): Promise<GetInstagramUserDetailsOutput> {
  return getIgUserDetailsFlow(input);
}

// --- Token Validation ---
export async function validateToken(input: ValidateTokenInput): Promise<ValidateTokenOutput> {
    return validateTokenFlow(input);
}


// --- Social Media Posting (Direct) ---
export async function postToInstagram(input: PostToInstagramInput) {
  return postToInstagramFlow(input);
}

export async function postToFacebook(input: PostToFacebookInput) {
  return postToFacebookFlow(input);
}

// --- Social Media Scheduling ---
export async function scheduleInstagramPost(input: ScheduleInstagramPostInput) {
  return scheduleInstagramPostFlow(input);
}

export async function scheduleFacebookPost(input: ScheduleFacebookPostInput) {
  return scheduleFacebookPostFlow(input);
}


// --- Social Media Data Fetching ---
export async function fetchInstagramMedia(
  input: any
): Promise<GetInstagramMediaOutput> {
  return getInstagramMediaFlow(input);
}

export async function fetchFacebookPosts(
  input: any
): Promise<GetFacebookPostsOutput> {
  return getFacebookPostsFlow(input);
}

export async function getAccountAnalytics(
    input: GetAccountAnalyticsInput
): Promise<AnalyticsOutput> {
    return getAccountAnalyticsFlow(input);
}
