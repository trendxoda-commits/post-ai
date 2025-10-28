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

let adminApp: App | undefined;

function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const apps = getApps();
  const existingApp = apps.find(app => app.name === 'admin');
  if (existingApp) {
    adminApp = existingApp;
    return adminApp;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace literal \n with actual newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    throw new Error(
      'Firebase Admin SDK credentials are not fully set in .env. Admin features will not work.'
    );
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  }, 'admin');
  
  return adminApp;
}

const getAllUsersWithAccountsFlow = ai.defineFlow(
  {
    name: 'getAllUsersWithAccountsFlow',
    inputSchema: z.void(),
    outputSchema: GetAllUsersOutputSchema,
  },
  async () => {
    try {
      const app = getAdminApp();
      const firestore = getFirestore(app);

      const usersSnapshot = await firestore.collection('users').get();
      if (usersSnapshot.empty) {
        return [];
      }

      const usersWithAccounts: UserWithAccounts[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data() as User;
        // The document ID from Firestore is the user's UID.
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
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
          socialAccounts: socialAccounts,
        });
      }

      return usersWithAccounts;
    } catch (error: any) {
      console.error('Error in getAllUsersWithAccountsFlow:', error);
      // Re-throw the error to be caught by the caller
      throw new Error(error.message);
    }
  }
);

export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
  return await getAllUsersWithAccountsFlow();
}
