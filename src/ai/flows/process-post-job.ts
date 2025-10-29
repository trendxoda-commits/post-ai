
'use server';

/**
 * @fileOverview Background Job Processor
 * This file contains the Genkit flow for processing a bulk post job in the background.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { postToFacebook } from './post-to-facebook';
import { postToInstagram } from './post-to-instagram';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { SocialAccount, ApiCredential, PostJob } from '@/lib/types';

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

const ProcessPostJobInputSchema = z.object({
  jobId: z.string().describe("The ID of the postJob document to process."),
  jobCreatorId: z.string().describe("The UID of the user who created the job."),
});
export type ProcessPostJobInput = z.infer<typeof ProcessPostJobInputSchema>;

const ProcessPostJobOutputSchema = z.object({
  status: z.string(),
});
export type ProcessPostJobOutput = z.infer<typeof ProcessPostJobOutputSchema>;


const processPostJobFlow = ai.defineFlow(
  {
    name: 'processPostJobFlow',
    inputSchema: ProcessPostJobInputSchema,
    outputSchema: ProcessPostJobOutputSchema,
  },
  async ({ jobId, jobCreatorId }) => {
    
    const jobDocRef = firestore.doc(`users/${jobCreatorId}/postJobs/${jobId}`);
    
    try {
        const jobDoc = await jobDocRef.get();
        if (!jobDoc.exists) {
            throw new Error(`Job with ID ${jobId} not found.`);
        }
        const job = jobDoc.data() as PostJob;

        // CRITICAL FIX: The Promise.all must wrap the entire mapping operation.
        const results = await Promise.allSettled(job.targets.map(async (target) => {
            const { userId, socialAccountId } = target;

            const accountDoc = await firestore.doc(`users/${userId}/socialAccounts/${socialAccountId}`).get();
            
            if (!accountDoc.exists) {
                throw new Error(`Account or credentials not found for target ${socialAccountId}.`);
            }
            
            const socialAccount = accountDoc.data() as SocialAccount;
            if (!socialAccount.pageAccessToken) {
                throw new Error(`Missing Page Access Token for account ${socialAccount.displayName}.`);
            }

            const postAction = socialAccount.platform === 'Facebook' ? postToFacebook : postToInstagram;
            
            const input = {
                facebookPageId: socialAccount.accountId, // for FB
                instagramUserId: socialAccount.accountId, // for IG
                mediaUrl: job.mediaUrl,
                caption: job.content,
                pageAccessToken: socialAccount.pageAccessToken,
                mediaType: job.mediaType,
            };
            
            // This is the promise that Promise.allSettled will wait for.
            return postAction(input);
        }));

        const finalResults = results.map((result, index) => ({
            socialAccountId: job.targets[index].socialAccountId,
            status: result.status,
            reason: result.status === 'rejected' ? (result.reason as Error).message : undefined,
        }));
        
        const successCount = finalResults.filter(r => r.status === 'fulfilled').length;
        const failureCount = finalResults.length - successCount;

        await jobDocRef.update({
            status: failureCount > 0 ? 'failed' : 'completed',
            results: finalResults,
            successCount,
            failureCount,
        });
        
        return { status: 'Job processed successfully.' };

    } catch (error: any) {
        console.error(`[CRITICAL] Failed to process job ${jobId}:`, error);
        await jobDocRef.update({
            status: 'failed',
            failureCount: (await jobDocRef.get()).data()?.totalTargets || 0,
            results: [{ socialAccountId: 'system', status: 'rejected', reason: error.message }],
        });
        return { status: `Job processing failed: ${error.message}` };
    }
  }
);


export async function processPostJob(input: ProcessPostJobInput): Promise<ProcessPostJobOutput> {
  // This is a fire-and-forget call from the client
  processPostJobFlow(input);
  return { status: 'Job processing started in the background.' };
}
