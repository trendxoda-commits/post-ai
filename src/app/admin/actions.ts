'use server';

import {
  getAllUsersWithAccounts as getAllUsersWithAccountsFlow,
  type UserWithAccounts,
} from '@/ai/flows/admin-actions';

/**
 * Fetches all users and their associated social accounts by calling a Genkit flow.
 * This is a server-side action for the admin panel.
 */
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
  try {
    const users = await getAllUsersWithAccountsFlow();
    return users;
  } catch (error: any) {
    console.error('Error fetching all users with accounts via flow:', error.message);
    // This could be due to permissions or incorrect service account setup.
    if (error.message.includes('credentials')) {
      throw new Error(
        'Could not fetch user data. Ensure server credentials are set up correctly in the .env file.'
      );
    }
    throw new Error(
      error.message || 'An unknown error occurred while fetching user data.'
    );
  }
}

export type { UserWithAccounts };
