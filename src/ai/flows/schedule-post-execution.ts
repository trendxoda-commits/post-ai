
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
import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

import type { SocialAccount, ScheduledPost } from '@/lib/types';


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
function getAdminApp(): App {
    const apps = getApps();
    const defaultApp = apps.find(app => app.name === '[DEFAULT]');
    if (defaultApp) {
        return defaultApp;
    }
    return initializeApp({ projectId: firebaseConfig.projectId });
}
const firestore = getFirestore(getAdminApp());


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
    const postsQuery = firestore.collection(`users/${userId}/scheduledPosts`).where('scheduledTime', '<=', now);

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
          await postDoc.ref.delete(); // Delete failed post
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
      
      // 4. Delete the post from the schedule after attempting to publish
      await postDoc.ref.delete();

      if (allSucceeded) {
        publishedPosts.push(postId);
      } else {
        failedPosts.push(postId);
      }
    }

    return { publishedPosts, failedPosts };
  }
);


export async function executeScheduledPosts(input: ExecuteScheduledPostsInput): Promise<ExecuteScheduledPostsOutput> {
  // Now we await the flow and handle potential errors.
  try {
    const result = await executeScheduledPostsFlow(input);
    return result;
  } catch (error) {
    console.error("Error executing scheduled posts flow:", error);
    // Return a failed state to the client.
    return { publishedPosts: [], failedPosts: [] };
  }
}
