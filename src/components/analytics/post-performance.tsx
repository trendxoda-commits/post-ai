
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Loader2, MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import type { SocialPost, SocialAccount } from '@/lib/types';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


export function PostPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  // Fetch the 12 most recent posts from the new collection
  const socialPostsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialPosts'), orderBy('timestamp', 'desc'), limit(12)) : null,
    [firestore, user]
  );
  const { data: posts, isLoading } = useCollection<SocialPost>(socialPostsQuery);
  
  // Fetch accounts to join author data to posts
  const socialAccountsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);


  // Join account data with posts
  const postsWithAccountData = useMemo(() => {
    if (!posts || !accounts) return posts;
    const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));
    return posts.map(post => ({
      ...post,
      account: {
        displayName: accountsMap.get(post.socialAccountId)?.displayName || 'Unknown',
        avatar: accountsMap.get(post.socialAccountId)?.avatar
      }
    }));
  }, [posts, accounts]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Post Performance</CardTitle>
        <CardDescription>
          Detailed statistics for each of your recent posts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : postsWithAccountData && postsWithAccountData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postsWithAccountData.map((post) => (
              <Card key={post.id} className="flex flex-col overflow-hidden">
                <CardHeader className="flex-row gap-3 items-center p-4">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={post.account?.avatar} alt={post.account?.displayName} />
                        <AvatarFallback>{post.account?.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow">
                        <CardTitle className="text-base">{post.account?.displayName}</CardTitle>
                         <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                     <Badge variant={post.platform === 'Instagram' ? 'destructive' : 'default'} className="ml-auto bg-blue-500 shrink-0">
                        {post.platform}
                    </Badge>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4 flex-grow">
                  {post.mediaUrl && (
                     <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="block relative aspect-square w-full rounded-md overflow-hidden group">
                        <Image
                            src={post.mediaUrl}
                            alt="Post media"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform group-hover:scale-105"
                        />
                     </a>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">
                    {post.content || 'No caption'}
                  </p>
                </CardContent>
                <div className="p-4 border-t flex justify-around items-center text-xs text-muted-foreground font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="h-4 w-4 text-blue-500" />
                    <span>{post.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span>{post.comments.toLocaleString()}</span>
                  </div>
                  {post.views > 0 && (
                     <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-purple-500" />
                        <span>{post.views.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Posts Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect an account or create a new post to see its performance here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
