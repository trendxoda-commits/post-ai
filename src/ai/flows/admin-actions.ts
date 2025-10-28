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


// Helper function to initialize Firebase Admin SDK within the flow.
// It ensures that initialization happens only once.
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Directly read from process.env, which is populated by `dotenv` at the start of dev.ts
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  };

  // Validate that all required environment variables are set
  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    throw new Error(
      'Firebase Admin SDK credentials are not fully set in .env. Admin features will not work.'
    );
  }

  return initializeApp({
    // The private key needs to have its newlines properly formatted.
    credential: cert({
      projectId: serviceAccount.projectId,
      clientEmail: serviceAccount.clientEmail,
      privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n'),
    }),
  });
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
