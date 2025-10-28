'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, SocialAccount } from '@/lib/types';

// IMPORTANT: This service account key is for server-side use only.
// It should be stored securely (e.g., in environment variables) in a real production environment.
// For this prototype, we are including it directly, but this is NOT recommended for production.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};


// Server-side Firebase initialization for Admin SDK
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApps()[0];
}

const firestore = getFirestore(adminApp);

export interface UserWithAccounts extends User {
    socialAccounts: SocialAccount[];
}

/**
 * Fetches all users and their associated social accounts.
 * This is a server-side action for the admin panel.
 */
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
    try {
        const usersSnapshot = await firestore.collection('users').get();
        if (usersSnapshot.empty) {
            return [];
        }
    
        const usersWithAccounts: UserWithAccounts[] = [];
    
        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data() as User;
            user.id = userDoc.id; // Ensure the user object has the document ID
            
            const socialAccountsSnapshot = await firestore
                .collection(`users/${user.id}/socialAccounts`)
                .get();

            const socialAccounts = socialAccountsSnapshot.docs.map(doc => doc.data() as SocialAccount);
            
            usersWithAccounts.push({
                ...user,
                socialAccounts: socialAccounts,
            });
        }
        
        return usersWithAccounts;

    } catch (error) {
        console.error("Error fetching all users with accounts:", error);
        // In a real app, you'd want more robust error handling.
        // This could be due to permissions or incorrect service account setup.
        throw new Error("Could not fetch user data. Ensure server credentials are set up correctly.");
    }
}
