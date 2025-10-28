
'use server';

import {
    getInstagramMedia as getInstagramMediaFlow,
    getFacebookPosts as getFacebookPostsFlow,
} from '@/ai/flows/social-media-actions';
import { getFirestore as getAdminFirestore, WriteBatch } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { collection, query, where, getDocs, doc, writeBatch, Firestore, getFirestore } from 'firebase/firestore';
import type { SocialAccount, SocialPost } from './types';
import { firebaseConfig } from '@/firebase/config';

// This function is now client-side and uses the client SDK
export async function clientSideSyncUserPosts(
    firestore: Firestore,
    userId: string,
    userAccessToken: string
) {
    const accountsRef = collection(firestore, 'users', userId, 'socialAccounts');
    const accountsSnapshot = await getDocs(accountsRef);

    if (accountsSnapshot.empty) {
        console.log(`No social accounts found for user ${userId}. Skipping post sync.`);
        return;
    }

    const allAccounts: SocialAccount[] = accountsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SocialAccount));

    for (const account of allAccounts) {
        try {
            let fetchedPosts: any[] = [];
            if (account.platform === 'Instagram') {
                const { media } = await getInstagramMediaFlow({
                    instagramUserId: account.accountId,
                    accessToken: userAccessToken,
                });
                fetchedPosts = media;
            } else if (account.platform === 'Facebook') {
                if (!account.pageAccessToken) continue;
                const { posts } = await getFacebookPostsFlow({
                    facebookPageId: account.accountId,
                    pageAccessToken: account.pageAccessToken,
                });
                fetchedPosts = posts;
            }

            if (fetchedPosts.length > 0) {
                await syncPostsToFirestoreClient(firestore, userId, account.id, account.platform, fetchedPosts);
            }

        } catch (error) {
            console.error(`Failed to fetch and sync posts for account ${account.displayName} (${account.id}):`, error);
        }
    }
}


/**
 * Syncs a batch of fetched posts to the socialPosts subcollection in Firestore using the CLIENT SDK.
 * It uses the post's platform-specific ID to avoid duplicates.
 */
async function syncPostsToFirestoreClient(
    firestore: Firestore,
    userId: string,
    socialAccountId: string,
    platform: 'Instagram' | 'Facebook',
    posts: any[]
) {
    const postsRef = collection(firestore, `users/${userId}/socialPosts`);
    const batch = writeBatch(firestore);

    for (const post of posts) {
        const postId = post.id;
        if (!postId) continue;

        const postData: Omit<SocialPost, 'id'> = {
            userId,
            socialAccountId,
            platform,
            postId: postId,
            content: platform === 'Instagram' ? post.caption : post.message,
            mediaUrl: platform === 'Instagram' ? post.media_url : post.attachments?.data[0]?.media?.image?.src,
            mediaType: platform === 'Instagram' ? post.media_type : (post.attachments?.data[0]?.type?.includes('video') ? 'VIDEO' : 'IMAGE'),
            permalink: post.permalink || post.permalink_url,
            likes: (platform === 'Instagram' ? post.like_count : post.likes?.summary.total_count) || 0,
            comments: (platform === 'Instagram' ? post.comments_count : post.comments?.summary.total_count) || 0,
            views: (platform === 'Instagram' && post.media_type === 'VIDEO' ? post.plays : (platform === 'Facebook' ? post.insights?.data?.find((d: any) => d.name === 'post_video_views')?.values[0]?.value : 0)) || 0,
            timestamp: platform === 'Instagram' ? post.timestamp : post.created_time,
        };
        
        // Ensure views are a number, default to 0 if null/undefined
        postData.views = postData.views || 0;

        // Query for an existing document with the same original postId to avoid duplicates.
        const q = query(postsRef, where("postId", "==", postId), where("socialAccountId", "==", socialAccountId));
        const existingDocs = await getDocs(q);

        if (existingDocs.empty) {
            // If it doesn't exist, create a new document.
            const newDocRef = doc(postsRef); // Firestore generates a new ID
            batch.set(newDocRef, postData);
        } else {
            // If it exists, update the existing document.
            const docToUpdateRef = existingDocs.docs[0].ref;
            batch.update(docToUpdateRef, postData);
        }
    }
    
    await batch.commit();
    console.log(`Synced ${posts.length} posts for account ${socialAccountId}.`);
}
