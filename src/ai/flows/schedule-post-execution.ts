'use server';

/**
 * @fileOverview AI Scheduler Agent
 * This file contains the Genkit flow responsible for executing scheduled posts.
 * It fetches pending scheduled posts from Firestore and publishes them if their time has come.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { postToFacebook } from './post-to-facebook';
import { postToInstagram } from './post-to-instagram';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

import type { SocialAccount, ApiCredential, ScheduledPost } from '@/lib/types';


const ExecuteScheduledPostsInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose scheduled posts should be checked.'),
});
export type ExecuteScheduledPostsInput = z.infer<typeof ExecuteScheduledPostsInputSchema>;

const ExecuteScheduledPostsOutputSchema = z.object({
  publishedPosts: z.array(z.string()).describe('A list of IDs of the posts that were successfully published.'),
  failedPosts: z.array(z.string()).describe('A list of IDs of the posts that failed to publish.'),
});
export type ExecuteScheduledPostsOutput = z.infer<typeof ExecuteScheduledPostsOutputSchema>;

// Server-side Firebase initialization
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  adminApp = getApps()[0];
}
const firestore = getFirestore(adminApp);


const executeScheduledPostsFlow = ai.defineFlow(
  {
    name: 'executeScheduledPostsFlow',
    inputSchema: ExecuteScheduledPostsInputSchema,
    outputSchema: ExecuteScheduledPostsOutputSchema,
  },
  async ({ userId }) => {
    const publishedPosts: string[] = [];
    const failedPosts: string[] = [];

    // 1. Fetch all pending scheduled posts for the user that are due
    const now = new Date().toISOString();
    const postsQuery = firestore.collection(`users/${userId}/scheduledPosts`).where('status', '==', 'scheduled').where('scheduledTime', '<=', now);

    const querySnapshot = await postsQuery.get();
    if (querySnapshot.empty) {
      // No posts are due, so we can exit.
      return { publishedPosts, failedPosts };
    }
    
    // 2. Get User's long-lived access token from apiCredentials (still useful for some operations)
    const credsRef = firestore.collection(`users/${userId}/apiCredentials`);
    const credsSnapshot = await credsRef.get();
    if (credsSnapshot.empty) {
        console.error(`No API credentials found for user ${userId}. Cannot process posts.`);
        // Mark all as failed since we can't do anything
        for (const postDoc of querySnapshot.docs) {
          failedPosts.push(postDoc.id);
          await postDoc.ref.update({ status: 'failed' });
        }
        return { publishedPosts, failedPosts };
    }


    // 3. Iterate over due posts and publish them
    for (const postDoc of querySnapshot.docs) {
      const post = postDoc.data() as ScheduledPost;
      const postId = postDoc.id;

      let allSucceeded = true;

      for (const accountId of post.socialAccountIds) {
        try {
            const accountDocRef = firestore.doc(`users/${userId}/socialAccounts/${accountId}`);
            const accountDoc = await accountDocRef.get();

            if (!accountDoc.exists) {
                throw new Error(`SocialAccount with ID ${accountId} not found.`);
            }
            
            const socialAccount = accountDoc.data() as SocialAccount;

            if (!post.mediaUrl || !post.mediaType) {
                throw new Error(`Post ${postId} is missing mediaUrl or mediaType.`);
            }

            // Ensure we have the necessary page access token for the specific account
            if (!socialAccount.pageAccessToken) {
                throw new Error(`Missing Page Access Token for account ${socialAccount.displayName}.`);
            }

            if (socialAccount.platform === 'Facebook') {
                await postToFacebook({
                    facebookPageId: socialAccount.accountId,
                    mediaUrl: post.mediaUrl,
                    caption: post.content,
                    pageAccessToken: socialAccount.pageAccessToken,
                    mediaType: post.mediaType,
                });
            } else if (socialAccount.platform === 'Instagram') {
                await postToInstagram({
                    instagramUserId: socialAccount.accountId,
                    mediaUrl: post.mediaUrl,
                    caption: post.content,
                    pageAccessToken: socialAccount.pageAccessToken,
                    mediaType: post.mediaType,
                });
            }
        } catch (error) {
            console.error(`Failed to publish post ${postId} to account ${accountId}:`, error);
            allSucceeded = false;
        }
      }
      
      // 4. Update the post status based on the outcome
      if (allSucceeded) {
        await postDoc.ref.update({ status: 'published' });
        publishedPosts.push(postId);
      } else {
        await postDoc.ref.update({ status: 'failed' });
        failedPosts.push(postId);
      }
    }

    return { publishedPosts, failedPosts };
  }
);


export async function executeScheduledPosts(input: ExecuteScheduledPostsInput): Promise<ExecuteScheduledPostsOutput> {
  // We run this flow but don't wait for it to complete. It's a "fire-and-forget" background task.
  executeScheduledPostsFlow(input);
  // Immediately return a response to the client.
  return { publishedPosts: [], failedPosts: [] };
}

    