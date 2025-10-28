'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { User, SocialAccount } from '@/lib/types';

// IMPORTANT: This service account key is for server-side use only.
// It must be stored securely in environment variables for production.
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};


// Server-side Firebase initialization for Admin SDK
let adminApp: App;

// Check if all required service account fields are present
if (serviceAccount.projectId && serviceAccount.clientEmail && serviceAccount.privateKey) {
    if (!getApps().length) {
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      adminApp = getApps()[0];
    }
} else {
    console.warn("Firebase Admin SDK credentials are not fully set in .env. Admin features will not work.");
}


const firestore = getApps().length ? getFirestore(adminApp) : null;

export interface UserWithAccounts extends User {
    socialAccounts: SocialAccount[];
}

/**
 * Fetches all users and their associated social accounts.
 * This is a server-side action for the admin panel.
 */
export async function getAllUsersWithAccounts(): Promise<UserWithAccounts[]> {
    if (!firestore) {
        throw new Error("Could not fetch user data. Ensure server credentials are set up correctly in the .env file.");
    }

    try {
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

    } catch (error) {
        console.error("Error fetching all users with accounts:", error);
        // This could be due to permissions or incorrect service account setup.
        throw new Error("Could not fetch user data. Ensure server credentials are set up correctly.");
    }
}
