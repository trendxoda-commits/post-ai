import type { Post, Account } from '@/lib/types';
import { PostCard } from './post-card';

interface FeedProps {
  posts: Post[];
  accounts: Account[];
}

export function Feed({ posts, accounts }: FeedProps) {
  return (
    <div className="space-y-6">
      {posts.map((post) => {
        const account = accounts.find((acc) => acc.id === post.accountId);
        if (!account) return null;
        return <PostCard key={post.id} post={post} account={account} />;
      })}
    </div>
  );
}
