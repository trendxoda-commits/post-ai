'use server';

import type { User } from '@/lib/types';
import {
  getAllUsersWithAccounts as getAllUsersWithAccountsFlow,
  type UserWithAccounts,
} from '@/ai/flows/admin-actions';


// This is the main server action that fetches all users and their accounts.
// It should only be callable by an authenticated admin user.
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
  try {
    // The actual logic is now deferred to a Genkit flow for better robustness
    // and to handle credentials in a more isolated environment.
    const users = await getAllUsersWithAccountsFlow();
    return users;
  } catch (error: any) {
    console.error('Error fetching all users via flow:', error);
    // Propagate a more user-friendly error message
    // The specific error from the flow (like credential issues) will be part of the message.
    throw new Error(`Failed to load user data. Reason: ${error.message}`);
  }
}

export type { UserWithAccounts };
