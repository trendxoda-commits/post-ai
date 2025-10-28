'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, MessageSquare, ThumbsUp, Eye } from 'lucide-react';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import {
  fetchFacebookPosts,
  fetchInstagramMedia,
} from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

// Combined type for posts from both platforms
type UnifiedPost = {
  id: string;
  platform: 'Facebook' | 'Instagram';
  content?: string | null;
  mediaUrl?: string;
  timestamp: string;
  permalink: string;
  likes: number;
  comments: number;
  views: number;
  account: {
    displayName: string;
    avatar?: string;
  }
};

export function PostPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const apiCredentialsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null),
    [firestore, user]
  );
  const { data: apiCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;

  useEffect(() => {
    const loadPosts = async () => {
      if (!accounts || !userAccessToken) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      let allPosts: UnifiedPost[] = [];

      for (const account of accounts) {
        try {
          if (account.platform === 'Instagram') {
            const { media } = await fetchInstagramMedia({
              instagramUserId: account.accountId,
              accessToken: userAccessToken, // Use USER access token for IG
            });
            allPosts.push(
              ...media.map((post) => ({
                id: post.id,
                platform: 'Instagram',
                content: post.caption,
                mediaUrl: post.media_url,
                timestamp: post.timestamp,
                permalink: post.permalink,
                likes: post.like_count || 0,
                comments: post.comments_count || 0,
                views: post.media_type === 'VIDEO' ? post.plays || 0 : 0,
                account: {
                  displayName: account.displayName,
                  avatar: account.avatar
                }
              }))
            );
          } else if (account.platform === 'Facebook') {
             const { posts: fbPosts } = await fetchFacebookPosts({
                facebookPageId: account.accountId,
                pageAccessToken: account.pageAccessToken!, // Use PAGE access token for FB
            });
             allPosts.push(
              ...fbPosts.map((post) => ({
                id: post.id,
                platform: 'Facebook',
                content: post.message,
                mediaUrl: post.attachments?.data[0]?.media?.image?.src || post.attachments?.data[0]?.url,
                timestamp: post.created_time,
                permalink: post.permalink_url,
                likes: post.likes?.summary.total_count || 0,
                comments: post.comments?.summary.total_count || 0,
                views: post.insights?.data?.find((d: any) => d.name === 'post_video_views')?.values[0]?.value || 0,
                 account: {
                  displayName: account.displayName,
                  avatar: account.avatar
                }
              }))
            );
          }
        } catch (error: any) {
          console.error(`Failed to fetch posts for ${account.displayName}:`, error);
          toast({
            variant: 'destructive',
            title: `Error fetching posts for ${account.displayName}`,
            description: error.message,
          });
        }
      }

      // Sort all posts by date, newest first
      allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPosts(allPosts);
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      loadPosts();
    } else if (accounts === null && user) {
        // accounts still loading
    } else {
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, user, toast]);

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
        ) : posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="flex flex-col">
                <CardHeader className="flex-row gap-3 items-center">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={post.account.avatar} alt={post.account.displayName} />
                        <AvatarFallback>{post.account.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-base">{post.account.displayName}</CardTitle>
                         <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                     <Badge variant={post.platform === 'Instagram' ? 'destructive' : 'default'} className="ml-auto bg-blue-500">
                        {post.platform}
                    </Badge>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  {post.mediaUrl && (
                     <a href={post.permalink} target="_blank" rel="noopener noreferrer" className="block relative aspect-square w-full rounded-md overflow-hidden">
                        <Image
                            src={post.mediaUrl}
                            alt="Post media"
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transition-transform hover:scale-105"
                        />
                     </a>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {post.content || 'No caption'}
                  </p>
                </CardContent>
                <div className="p-6 pt-0 flex justify-around items-center border-t mt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ThumbsUp className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm">{post.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm">{post.comments.toLocaleString()}</span>
                  </div>
                  {post.views > 0 && (
                     <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4 text-purple-500" />
                        <span className="font-semibold text-sm">{post.views.toLocaleString()}</span>
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
