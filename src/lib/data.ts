

'use server';

import {
    getInstagramMedia as getInstagramMediaFlow,
    getFacebookPosts as getFacebookPostsFlow,
    getInstagramComments,
    getFacebookComments,
} from '@/ai/flows/social-media-actions';
import { getFirestore as getAdminFirestore, WriteBatch } from 'firebase-admin/firestore';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { collection, query, where, getDocs, doc, writeBatch, Firestore } from 'firebase/firestore';
import type { SocialAccount, SocialPost, SocialComment } from './types';
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
                // After syncing posts, sync their comments
                await clientSideSyncAllCommentsForAccount(firestore, userId, account, userAccessToken);
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
            views: (platform === 'Instagram' ? (post.video_views || 0) : (post.insights?.post_video_views || 0)),
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


/**
 * Fetches all posts for a given account, then fetches and syncs all comments for each of those posts.
 * This is a client-side function.
 */
async function clientSideSyncAllCommentsForAccount(
    firestore: Firestore,
    userId: string,
    account: SocialAccount,
    userAccessToken: string
) {
    console.log(`Starting comment sync for account: ${account.displayName}`);
    const postsRef = collection(firestore, 'users', userId, 'socialPosts');
    const q = query(postsRef, where("socialAccountId", "==", account.id));
    const postsSnapshot = await getDocs(q);

    if (postsSnapshot.empty) {
        console.log(`No posts found for account ${account.displayName} to sync comments from.`);
        return;
    }

    for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data() as SocialPost;
        try {
            let fetchedComments: any[] = [];
            const accessToken = account.pageAccessToken || userAccessToken;

            if (account.platform === 'Instagram') {
                const { comments } = await getInstagramComments({ mediaId: post.postId, accessToken });
                fetchedComments = comments;
            } else if (account.platform === 'Facebook') {
                const { comments } = await getFacebookComments({ mediaId: post.postId, accessToken });
                fetchedComments = comments;
            }

            if (fetchedComments.length > 0) {
                await syncCommentsToFirestoreClient(firestore, userId, account.id, postDoc.id, account.platform, fetchedComments);
            }
        } catch (error) {
            console.error(`Failed to sync comments for post ${post.postId}:`, error);
        }
    }
    console.log(`Finished comment sync for account: ${account.displayName}`);
}

/**
 * Syncs a batch of fetched comments to the socialComments subcollection in Firestore using the CLIENT SDK.
 */
async function syncCommentsToFirestoreClient(
    firestore: Firestore,
    userId: string,
    socialAccountId: string,
    socialPostId: string, // This is our internal Firestore post ID
    platform: 'Instagram' | 'Facebook',
    comments: any[]
) {
    const commentsRef = collection(firestore, `users/${userId}/socialComments`);
    const batch = writeBatch(firestore);

    for (const comment of comments) {
        const commentId = comment.id;
        if (!commentId) continue;

        const commentData: Omit<SocialComment, 'id'> = {
            userId,
            socialAccountId,
            socialPostId,
            platform,
            commentId: comment.id,
            text: comment.text,
            timestamp: comment.timestamp,
            from: {
                id: comment.from?.id,
                name: comment.from?.username || comment.from?.name,
            },
            isHidden: comment.is_hidden || false,
        };

        const q = query(commentsRef, where("commentId", "==", commentId));
        const existingDocs = await getDocs(q);

        if (existingDocs.empty) {
            const newDocRef = doc(commentsRef);
            batch.set(newDocRef, { ...commentData, id: newDocRef.id });
        } else {
            const docToUpdateRef = existingDocs.docs[0].ref;
            batch.update(docToUpdateRef, commentData);
        }
    }
    
    await batch.commit();
    console.log(`Synced ${comments.length} comments for post ${socialPostId}.`);
}
