'use server';

/**
 * @fileOverview Admin actions flow
 * This file contains Genkit flows for administrative tasks, like fetching all user data.
 * - getAllUsersWithAccounts - Fetches all users and their connected social accounts.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { SocialAccount, User } from '@/lib/types';


// Define the output schemas for Zod validation
const SocialAccountSchema = z.object({
  id: z.string(),
  userId: z.string(),
  platform: z.enum(['Instagram', 'Facebook']),
  accountId: z.string(),
  displayName: z.string(),
  avatar: z.string().optional(),
  pageAccessToken: z.string().optional(),
});

const UserWithAccountsSchema = z.object({
  id: z.string(),
  email: z.string(),
  createdAt: z.string(),
  socialAccounts: z.array(SocialAccountSchema),
});

export type UserWithAccounts = z.infer<typeof UserWithAccountsSchema>;

const GetAllUsersOutputSchema = z.array(UserWithAccountsSchema);


/**
 * Initializes and returns the Firebase Admin App instance, ensuring it's a singleton.
 * This function now uses a single Base64-encoded service account environment variable
 * to avoid formatting issues with private keys in .env files.
 *
 * @returns {App} The initialized Firebase Admin App.
 * @throws {Error} If the FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set.
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (!serviceAccountBase64) {
    throw new Error(
      'Firebase Admin SDK credentials are not set. Please set the FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.'
    );
  }

  try {
    const serviceAccountJson = Buffer.from(
      serviceAccountBase64,
      'base64'
    ).toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Failed to parse or initialize Firebase Admin SDK credentials:', error);
    throw new Error(
      `Could not initialize Firebase Admin SDK. Ensure FIREBASE_SERVICE_ACCOUNT_BASE64 is a valid Base64-encoded service account JSON. Details: ${error.message}`
    );
  }
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
      const auth = getAuth(app);

      const listUsersResult = await auth.listUsers();
      const allUsers = listUsersResult.users;

      const usersWithAccounts: UserWithAccounts[] = [];

      for (const userRecord of allUsers) {
        const user: User = {
          id: userRecord.uid,
          email: userRecord.email || 'No email',
          createdAt: userRecord.metadata.creationTime,
        };

        const socialAccountsSnapshot = await firestore
          .collection(`users/${user.id}/socialAccounts`)
          .get();

        const socialAccounts = socialAccountsSnapshot.docs.map(
          (doc) => doc.data() as z.infer<typeof SocialAccountSchema>
        );

        usersWithAccounts.push({
          ...user,
          socialAccounts,
        });
      }

      return usersWithAccounts;

    } catch (error: any) {
      console.error('[Admin Flow] Error fetching users:', error);
      // Re-throw the error so it propagates to the client action and can be displayed.
      throw new Error(error.message || "An unknown error occurred in the admin flow.");
    }
  }
);


export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
    return getAllUsersWithAccountsFlow();
}