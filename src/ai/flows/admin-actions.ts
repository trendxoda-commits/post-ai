'use server';

/**
 * @fileOverview Admin actions flow
 * This file contains Genkit flows for administrative tasks.
 * - getAllUsersWithAccounts - Fetches all users and their social accounts.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, SocialAccount } from '@/lib/types';

// Define the output schema for a user with their accounts
const UserWithAccountsSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  socialAccounts: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      platform: z.enum(['Instagram', 'Facebook']),
      accountId: z.string(),
      displayName: z.string(),
      avatar: z.string().optional(),
      pageAccessToken: z.string().optional(),
    })
  ),
});

export type UserWithAccounts = z.infer<typeof UserWithAccountsSchema>;

const GetAllUsersOutputSchema = z.array(UserWithAccountsSchema);

let adminApp: App | null = null;

function initializeAdminApp() {
  if (adminApp) {
    return adminApp;
  }
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (
    serviceAccount.projectId &&
    serviceAccount.clientEmail &&
    serviceAccount.privateKey
  ) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    return adminApp;
  }

  throw new Error(
    'Firebase Admin SDK credentials are not fully set in .env. Admin features will not work.'
  );
}

const getAllUsersWithAccountsFlow = ai.defineFlow(
  {
    name: 'getAllUsersWithAccountsFlow',
    inputSchema: z.void(),
    outputSchema: GetAllUsersOutputSchema,
  },
  async () => {
    try {
      const app = initializeAdminApp();
      const firestore = getFirestore(app);

      const usersSnapshot = await firestore.collection('users').get();
      if (usersSnapshot.empty) {
        return [];
      }

      const usersWithAccounts: UserWithAccounts[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data() as User;
        user.id = userDoc.id;

        const socialAccountsSnapshot = await firestore
          .collection(`users/${user.id}/socialAccounts`)
          .get();

        const socialAccounts = socialAccountsSnapshot.docs.map((doc) => {
          const accountData = doc.data() as SocialAccount;
          accountData.id = doc.id;
          return accountData;
        });

        usersWithAccounts.push({
          ...user,
          socialAccounts: socialAccounts,
        });
      }

      return usersWithAccounts;
    } catch (error: any) {
      console.error('Error in getAllUsersWithAccountsFlow:', error);
      // Re-throw the error to be caught by the caller in actions.ts
      throw new Error(error.message);
    }
  }
);

export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
  return await getAllUsersWithAccountsFlow();
}
