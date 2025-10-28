
'use server';

/**
 * @fileOverview Admin Actions
 * This file contains Genkit flows for administrative tasks, using the firebase-admin SDK
 * to access data across all users, bypassing security rules.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { SocialAccount } from '@/lib/types';


// #################### Initialize Firebase Admin SDK ####################

let adminApp: App;
if (!getApps().length) {
  // This initialization should work in a server environment where GOOGLE_APPLICATION_CREDENTIALS is set.
  adminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  adminApp = getApps()[0];
}
const firestore = getFirestore(adminApp);


// #################### Get All Accounts Flow ####################

const FullAccountDetailsSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  platform: z.enum(['Instagram', 'Facebook']),
  user: z.object({
    id: z.string(),
    email: z.string(),
  }),
});

const GetAdminAllAccountsOutputSchema = z.object({
  accounts: z.array(FullAccountDetailsSchema),
});
export type GetAdminAllAccountsOutput = z.infer<typeof GetAdminAllAccountsOutputSchema>;


const getAdminAllAccountsFlow = ai.defineFlow(
  {
    name: 'getAdminAllAccountsFlow',
    inputSchema: z.void(), // No input needed
    outputSchema: GetAdminAllAccountsOutputSchema,
  },
  async () => {
    const allAccounts: z.infer<typeof FullAccountDetailsSchema>[] = [];

    // 1. Get all users
    const usersSnapshot = await firestore.collection('users').get();
    
    // 2. For each user, get their socialAccounts subcollection
    for (const userDoc of usersSnapshot.docs) {
      const user = {
        id: userDoc.id,
        email: userDoc.data().email || 'N/A',
      };
      
      const socialAccountsSnapshot = await userDoc.ref.collection('socialAccounts').get();
      
      socialAccountsSnapshot.forEach(accountDoc => {
        const account = accountDoc.data() as SocialAccount;
        allAccounts.push({
          id: accountDoc.id,
          displayName: account.displayName,
          platform: account.platform,
          user: user,
        });
      });
    }

    return { accounts: allAccounts };
  }
);


export async function getAdminAllAccounts(): Promise<GetAdminAllAccountsOutput> {
  return getAdminAllAccountsFlow();
}
