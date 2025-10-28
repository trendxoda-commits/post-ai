'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, SocialAccount } from '@/lib/types';

// IMPORTANT: This service account key is for server-side use only.
// It must be stored securely in environment variables for production.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // Correctly handle escaped newlines from environment variables.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

function getAdminApp(): App {
    // If there's already an initialized app, return it.
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // Validate that all necessary parts of the service account are present.
    if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
        // Initialize the app with the credentials.
        return initializeApp({
            credential: cert(serviceAccount),
        });
    }

    // If credentials are not set, throw a specific error.
    throw new Error("Firebase Admin SDK credentials are not fully set in .env. Admin features will not work.");
}

export interface UserWithAccounts extends User {
    socialAccounts: SocialAccount[];
}

/**
 * Fetches all users and their associated social accounts.
 * This is a server-side action for the admin panel.
 */
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
    try {
        const adminApp = getAdminApp();
        const firestore = getFirestore(adminApp);
        
        const usersSnapshot = await firestore.collection('users').get();
        if (usersSnapshot.empty) {
            return [];
        }
    
        const usersWithAccounts: UserWithAccounts[] = [];
    
        for (const userDoc of usersSnapshot.docs) {
            const user = userDoc.data() as User;
            // The user ID from auth might not be the doc ID if we set it manually
            // but in our current setup, the doc ID IS the user UID.
            user.id = userDoc.id; 
            
            const socialAccountsSnapshot = await firestore
                .collection(`users/${user.id}/socialAccounts`)
                .get();

            const socialAccounts = socialAccountsSnapshot.docs.map(doc => {
                const accountData = doc.data() as SocialAccount;
                // ensure the ID field is populated from the document ID
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
        console.error("Error fetching all users with accounts:", error.message);
        // This could be due to permissions or incorrect service account setup.
        if (error.message.includes("credentials")) {
             throw new Error("Could not fetch user data. Ensure server credentials are set up correctly in the .env file.");
        }
        throw new Error(error.message || "An unknown error occurred while fetching user data.");
    }
}
