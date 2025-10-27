'use client';

import type { Post, SocialAccount } from '@/lib/types';
import { PostCard } from './post-card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export function Feed() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

  // This is still using placeholder posts. A real implementation would fetch posts
  // for the connected accounts from their respective APIs.
  const posts: Post[] = [
    {
      id: 'post1',
      accountId: accounts?.[0]?.id || 'acc1',
      content: 'Enjoying the serene beauty of the mountains. #nature #mountains #travel',
      likes: 1200,
      comments: 45,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'post2',
      accountId: accounts?.[1]?.id || 'acc2',
      content: 'Had the most amazing pasta for dinner! 🍝 #food #pasta #italianfood',
      likes: 350,
      comments: 22,
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const account = accounts?.find((acc) => acc.id === post.accountId);
        if (!account) return null;
        return <PostCard key={post.id} post={post} account={account} />;
      })}
       {(!accounts || accounts.length === 0) && (
         <div className="text-center py-10 border rounded-lg">
            <p className="text-muted-foreground">No accounts connected yet.</p>
            <p className="text-sm text-muted-foreground">Go to settings to add your social media accounts.</p>
         </div>
       )}
    </div>
  );
}
