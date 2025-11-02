
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
  getInstagramComments as getInstagramCommentsFlow,
  getFacebookComments as getFacebookCommentsFlow,
  replyToInstagramComment as replyToInstagramCommentFlow,
  replyToFacebookComment as replyToFacebookCommentFlow,
  type GetInstagramMediaOutput,
  type GetFacebookPostsOutput,
  type GetAccountAnalyticsInput,
  type AnalyticsOutput,
  type GetCommentsInput,
  type GetCommentsOutput,
  type ReplyToCommentInput,
  type ReplyToCommentOutput,
} from '@/ai/flows/social-media-actions';
import {
    validateToken as validateTokenFlow,
    type ValidateTokenInput,
    type ValidateTokenOutput,
} from '@/ai/flows/validate-token';


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


// --- Unified Inbox Actions ---
export async function getInstagramComments(input: GetCommentsInput): Promise<GetCommentsOutput> {
    return getInstagramCommentsFlow(input);
}

export async function getFacebookComments(input: GetCommentsInput): Promise<GetCommentsOutput> {
    return getFacebookCommentsFlow(input);
}

export async function replyToInstagramComment(input: ReplyToCommentInput): Promise<ReplyToCommentOutput> {
    return replyToInstagramCommentFlow(input);
}

export async function replyToFacebookComment(input: ReplyToCommentInput): Promise<ReplyToCommentOutput> {
    return replyToFacebookCommentFlow(input);
}
