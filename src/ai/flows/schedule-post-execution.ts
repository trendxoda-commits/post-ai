
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

    const now = new Date().toISOString();
    const postsQuery = firestore.collection(`users/${userId}/scheduledPosts`)
        .where('scheduledTime', '<=', now)
        .where('status', 'in', ['scheduled', 'processing']); // Get scheduled posts and immediate jobs

    const querySnapshot = await postsQuery.get();
    if (querySnapshot.empty) {
      return { publishedPosts, failedPosts };
    }
    
    for (const postDoc of querySnapshot.docs) {
      const post = postDoc.data() as ScheduledPost;
      const postId = postDoc.id;

      // Mark the job as processing
      await postDoc.ref.update({ status: 'processing' });

      try {
        const postPromises = post.socialAccountIds.map(async (accountId) => {
            const accountDocRef = firestore.doc(`users/${userId}/socialAccounts/${accountId}`);
            const accountDoc = await accountDocRef.get();

            if (!accountDoc.exists) {
                throw new Error(`SocialAccount with ID ${accountId} not found.`);
            }
            
            const socialAccount = accountDoc.data() as SocialAccount;

            if (!post.mediaUrl || !post.mediaType) {
                throw new Error(`Post ${postId} is missing mediaUrl or mediaType.`);
            }

            if (!socialAccount.pageAccessToken) {
                throw new Error(`Missing Page Access Token for account ${socialAccount.displayName}.`);
            }

            const postAction = socialAccount.platform === 'Facebook' ? postToFacebook : postToInstagram;
            const input = {
                facebookPageId: socialAccount.accountId,
                instagramUserId: socialAccount.accountId,
                mediaUrl: post.mediaUrl,
                caption: post.content,
                pageAccessToken: socialAccount.pageAccessToken,
                mediaType: post.mediaType,
            };
            
            return postAction(input);
        });

        const results = await Promise.allSettled(postPromises);
        
        let allSucceeded = true;
        results.forEach(result => {
            if (result.status === 'rejected') {
            console.error(`A post in batch ${postId} failed:`, result.reason);
            allSucceeded = false;
            }
        });

        if (allSucceeded) {
            await postDoc.ref.update({ status: 'completed' });
            publishedPosts.push(postId);
        } else {
            await postDoc.ref.update({ status: 'failed' });
            failedPosts.push(postId);
        }

        // If it was a "Post Now" job, delete it after completion/failure
        if (post.isNow) {
            await postDoc.ref.delete();
        }

      } catch(e) {
          console.error(`Critical error processing post ${postId}:`, e);
          await postDoc.ref.update({ status: 'failed' });
          failedPosts.push(postId);
      }
    }

    return { publishedPosts, failedPosts };
  }
);


export async function executeScheduledPosts(input: ExecuteScheduledPostsInput): Promise<ExecuteScheduledPostsOutput> {
  // This is a fire-and-forget call. We don't await the flow.
  // The client will get an immediate response.
  executeScheduledPostsFlow(input);
  return { publishedPosts: [], failedPosts: [] };
}
