'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { SocialAccount, User } from '@/lib/types';

// This is a type for the data we want to send to the client.
// It's a combination of the user's data and their social accounts.
export interface UserWithAccounts extends User {
  socialAccounts: SocialAccount[];
}

// Helper function to initialize Firebase Admin SDK.
// It ensures that initialization happens only once.
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Securely get credentials from environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Important for Vercel/similar envs
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
    credential: cert(serviceAccount),
  });
}

// This is the main server action that fetches all users and their accounts.
// It should only be callable by an authenticated admin user.
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
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
        (doc) => doc.data() as SocialAccount
      );

      usersWithAccounts.push({
        ...user,
        socialAccounts,
      });
    }

    return usersWithAccounts;
  } catch (error: any) {
    console.error('Error fetching all users with accounts:', error);
    // Propagate a more user-friendly error message
    throw new Error(`Failed to load user data. Reason: ${error.message}`);
  }
}
