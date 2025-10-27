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
import { initializeFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';


const ExecuteScheduledPostsInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose scheduled posts should be checked.'),
});
export type ExecuteScheduledPostsInput = z.infer<typeof ExecuteScheduledPostsInputSchema>;

const ExecuteScheduledPostsOutputSchema = z.object({
  publishedPosts: z.array(z.string()).describe('A list of IDs of the posts that were successfully published.'),
  failedPosts: z.array(z.string()).describe('A list of IDs of the posts that failed to publish.'),
});
export type ExecuteScheduledPostsOutput = z.infer<typeof ExecuteScheduledPostsOutputSchema>;

// Initialize Firestore outside the flow to be reused.
const { firestore } = initializeFirebase();

const executeScheduledPostsFlow = ai.defineFlow(
  {
    name: 'executeScheduledPostsFlow',
    inputSchema: ExecuteScheduledPostsInputSchema,
    outputSchema: ExecuteScheduledPostsOutputSchema,
  },
  async ({ userId }) => {
    const publishedPosts: string[] = [];
    const failedPosts: string[] = [];

    // 1. Fetch all pending scheduled posts for the user
    const now = new Date().toISOString();
    const postsQuery = query(
      collection(firestore, 'users', userId, 'scheduledPosts'),
      where('scheduledTime', '<=', now)
    );

    const querySnapshot = await getDocs(postsQuery);
    if (querySnapshot.empty) {
      return { publishedPosts, failedPosts };
    }
    
    // 2. Get User's long-lived access token from apiCredentials
    const credsRef = collection(firestore, 'users', userId, 'apiCredentials');
    const credsSnapshot = await getDocs(credsRef);
    if (credsSnapshot.empty) {
        console.error(`No API credentials found for user ${userId}. Cannot process posts.`);
        // Mark all as failed since we can't do anything
        querySnapshot.docs.forEach(d => failedPosts.push(d.id));
        return { publishedPosts, failedPosts };
    }
    const apiCredential = credsSnapshot.docs[0].data() as ApiCredential;
    const userAccessToken = apiCredential.accessToken;


    // 3. Iterate over due posts and publish them
    for (const postDoc of querySnapshot.docs) {
      const post = postDoc.data();
      const postId = postDoc.id;

      let allSucceeded = true;

      for (const accountId of post.socialAccountIds) {
        try {
            const accountDocRef = doc(firestore, 'users', userId, 'socialAccounts', accountId);
            const accountDoc = await getDoc(accountDocRef);

            if (!accountDoc.exists()) {
                throw new Error(`SocialAccount with ID ${accountId} not found.`);
            }
            
            const socialAccount = accountDoc.data() as SocialAccount;

            if (socialAccount.platform === 'Facebook') {
                await postToFacebook({
                    facebookPageId: socialAccount.accountId,
                    mediaUrl: post.mediaUrl,
                    caption: post.content,
                    pageAccessToken: socialAccount.pageAccessToken!,
                    mediaType: post.mediaType,
                });
            } else if (socialAccount.platform === 'Instagram') {
                await postToInstagram({
                    instagramUserId: socialAccount.accountId,
                    mediaUrl: post.mediaUrl,
                    caption: post.content,
                    pageAccessToken: socialAccount.pageAccessToken!,
                    mediaType: post.mediaType,
                });
            }
        } catch (error) {
            console.error(`Failed to publish post ${postId} to account ${accountId}:`, error);
            allSucceeded = false;
        }
      }
      
      // 4. If all publications for a post were successful, delete it from the schedule
      if (allSucceeded) {
        await deleteDoc(doc(firestore, 'users', userId, 'scheduledPosts', postId));
        publishedPosts.push(postId);
      } else {
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
