'use client';

import { useState, useEffect } from 'react';
import type { SocialAccount } from '@/lib/types';
import { PostCard } from './post-card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { fetchInstagramMedia, fetchFacebookPosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// A unified post type for the feed
export interface FeedPost {
  id: string;
  accountId: string;
  accountDisplayName: string;
  accountAvatar?: string;
  accountPlatform: 'Instagram' | 'Facebook';
  content?: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'ALBUM' | 'SHARE';
  likes: number;
  comments: number;
  views?: number;
  timestamp: string;
  permalink: string;
}

export function Feed() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'facebook' | 'instagram'>('all');

  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const apiCredentialsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null
  , [firestore, user]);
  const { data: apiCredentials } = useCollection(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;

  const fetchPosts = async () => {
    if (!accounts || !userAccessToken) return;

    setIsLoading(true);
    setError(null);
    setPosts([]);

    try {
      const allPosts: FeedPost[] = [];

      for (const account of accounts) {
        if (account.platform === 'Instagram') {
          const result = await fetchInstagramMedia({
            instagramUserId: account.accountId,
            accessToken: userAccessToken,
          });

          const igPosts = result.media.map((item): FeedPost => ({
            id: item.id,
            accountId: account.id,
            accountDisplayName: account.displayName,
            accountAvatar: account.avatar,
            accountPlatform: 'Instagram',
            content: item.caption,
            mediaUrl: item.media_url,
            mediaType: item.media_type as 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM',
            likes: item.like_count ?? 0,
            comments: item.comments_count ?? 0,
            views: item.plays,
            timestamp: item.timestamp,
            permalink: item.permalink,
          }));
          allPosts.push(...igPosts);

        } else if (account.platform === 'Facebook') {
          const result = await fetchFacebookPosts({
            facebookPageId: account.accountId,
            pageAccessToken: account.pageAccessToken!,
          });

          const fbPosts = result.posts
            .filter(item => item.attachments?.data?.[0]?.media?.image?.src || item.attachments?.data?.[0]?.media?.source) // Ensure there's media to display
            .map((item): FeedPost => {
                const attachment = item.attachments.data[0];
                const isVideo = attachment.type === 'video_inline' || attachment.type === 'video' || !!attachment.media.source;
                const mediaUrl = isVideo ? attachment.media.source : attachment.media.image.src;

                // Safely extract video views
                let views = 0;
                 if (isVideo && item.insights?.data?.length > 0) {
                    const viewsInsight = item.insights.data.find((insight: any) => insight.name === 'post_video_views');
                    if (viewsInsight && viewsInsight.values?.length > 0) {
                        views = viewsInsight.values[0].value;
                    }
                }
                
                return {
                    id: item.id,
                    accountId: account.id,
                    accountDisplayName: account.displayName,
                    accountAvatar: account.avatar,
                    accountPlatform: 'Facebook',
                    content: item.message,
                    mediaUrl: mediaUrl,
                    mediaType: isVideo ? 'VIDEO' : 'IMAGE',
                    likes: item.likes?.summary.total_count ?? 0,
                    comments: item.comments?.summary.total_count ?? 0,
                    views: views,
                    timestamp: item.created_time,
                    permalink: item.permalink_url,
                }
            });
          allPosts.push(...fbPosts);
        }
      }
      
      // Sort all posts by timestamp, newest first
      allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setPosts(allPosts);
    } catch (err: any) {
      console.error("Failed to fetch posts:", err);
      setError(err.message || "An unknown error occurred while fetching posts.");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Automatically fetch posts if accounts and token are loaded
    if(accounts && userAccessToken) {
        fetchPosts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, userAccessToken]);
  
  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return post.accountPlatform.toLowerCase() === filter;
  });


  if (isLoadingAccounts) {
     return <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg bg-card text-card-foreground">
        <p className="text-muted-foreground">No accounts connected yet.</p>
        <p className="text-sm text-muted-foreground">Go to settings to add your social media accounts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <Select onValueChange={(value: 'all' | 'facebook' | 'instagram') => setFilter(value)} defaultValue="all">
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder="Filter by account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchPosts} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Refresh Feed
            </Button>
        </div>
      {isLoading && posts.length === 0 && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
      
      {!isLoading && error && (
         <div className="text-center py-10 border rounded-lg border-destructive bg-destructive/10 text-destructive-foreground">
            <p className="font-semibold">Failed to load feed</p>
            <p className="text-sm">{error}</p>
         </div>
      )}

      {filteredPosts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      
      {!isLoading && !error && filteredPosts.length === 0 && (
         <div className="text-center py-10 border rounded-lg bg-card text-card-foreground">
            <p className="text-muted-foreground">No posts found for the selected filter.</p>
            <p className="text-sm text-muted-foreground">Once you post something, it will appear here.</p>
         </div>
       )}
    </div>
  );
}
