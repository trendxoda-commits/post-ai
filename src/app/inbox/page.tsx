'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, MessageSquare, CornerDownRight } from 'lucide-react';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import {
  fetchFacebookPosts,
  fetchInstagramMedia,
  fetchFacebookComments,
  fetchInstagramComments,
} from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

// Combined type for posts from both platforms
type UnifiedPost = {
  id: string;
  accountId: string;
  accountDisplayName: string;
  accountAvatar?: string;
  platform: 'Facebook' | 'Instagram';
  content?: string | null;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
  permalink: string;
  accessToken: string;
};

// Combined type for comments
type UnifiedComment = {
  id: string;
  author: string;
  text: string;
  timestamp: string;
};

export default function InboxPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [comments, setComments] = useState<Record<string, UnifiedComment[]>>({});
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});
  const [openPostId, setOpenPostId] = useState<string | null>(null);

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
        setIsLoadingPosts(false);
        return;
      }
      setIsLoadingPosts(true);
      let allPosts: UnifiedPost[] = [];

      for (const account of accounts) {
        try {
          if (account.platform === 'Facebook' && account.pageAccessToken) {
            const { posts: fbPosts } = await fetchFacebookPosts({
              facebookPageId: account.accountId,
              pageAccessToken: account.pageAccessToken,
            });
            allPosts.push(
              ...fbPosts.map((post) => ({
                id: post.id,
                accountId: account.id,
                accountDisplayName: account.displayName,
                accountAvatar: account.avatar,
                platform: 'Facebook',
                content: post.message,
                mediaUrl: post.attachments?.data[0]?.media?.image?.src,
                mediaType: post.attachments?.data[0]?.type?.includes('video') ? 'VIDEO' : 'IMAGE',
                timestamp: post.created_time,
                permalink: post.permalink_url,
                accessToken: account.pageAccessToken!,
              }))
            );
          } else if (account.platform === 'Instagram') {
            const { media } = await fetchInstagramMedia({
              instagramUserId: account.accountId,
              accessToken: userAccessToken,
            });
            allPosts.push(
              ...media.map((post) => ({
                id: post.id,
                accountId: account.id,
                accountDisplayName: account.displayName,
                accountAvatar: account.avatar,
                platform: 'Instagram',
                content: post.caption,
                mediaUrl: post.media_url,
                mediaType: post.media_type,
                timestamp: post.timestamp,
                permalink: post.permalink,
                accessToken: account.pageAccessToken!, // IG comments need page token
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
      setIsLoadingPosts(false);
    };

    if (accounts && userAccessToken) {
      loadPosts();
    } else if (accounts === null && user) {
        // accounts still loading
    } else {
      setIsLoadingPosts(false);
    }
  }, [accounts, userAccessToken, user, toast]);

  const handlePostToggle = async (postId: string) => {
    if (openPostId === postId) {
      setOpenPostId(null);
      return;
    }

    setOpenPostId(postId);

    // Fetch comments if not already fetched
    if (!comments[postId]) {
      setIsLoadingComments((prev) => ({ ...prev, [postId]: true }));
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      try {
        let fetchedComments: UnifiedComment[] = [];
        if (post.platform === 'Facebook') {
          const { comments: fbComments } = await fetchFacebookComments({
            postId: post.id,
            accessToken: post.accessToken,
          });
          fetchedComments = fbComments.map((c: any) => ({
            id: c.id,
            author: c.from.name,
            text: c.message,
            timestamp: c.created_time,
          }));
        } else { // Instagram
          const { comments: igComments } = await fetchInstagramComments({
            mediaId: post.id,
            accessToken: post.accessToken,
          });
          fetchedComments = igComments.map((c: any) => ({
            id: c.id,
            author: c.from.username,
            text: c.text,
            timestamp: c.timestamp,
          }));
        }
        setComments((prev) => ({ ...prev, [postId]: fetchedComments }));
      } catch (error: any) {
        console.error(`Failed to fetch comments for post ${postId}:`, error);
        toast({
          variant: 'destructive',
          title: 'Could not fetch comments',
          description: error.message,
        });
      } finally {
        setIsLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Inbox</h1>
        <p className="text-muted-foreground max-w-2xl">
          View and reply to comments from your connected accounts. Click on a post to see its comments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Posts & Comments</CardTitle>
          <CardDescription>
            A unified feed of your most recent posts across all platforms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPosts ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              value={openPostId}
              onValueChange={handlePostToggle}
            >
              {posts.map((post) => (
                <AccordionItem value={post.id} key={post.id}>
                  <AccordionTrigger className="hover:bg-muted/50 rounded-md p-4 w-full">
                    <div className="flex items-start gap-4 text-left w-full">
                      {post.mediaUrl && (
                        <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={post.mediaUrl}
                            alt="Post media"
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={post.accountAvatar} alt={post.accountDisplayName} />
                            <AvatarFallback>{post.accountDisplayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm">{post.accountDisplayName}</p>
                          <p className="text-xs text-muted-foreground">({post.platform})</p>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content || 'No caption'}
                        </p>
                         <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 pr-4 py-4">
                    {isLoadingComments[post.id] ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading comments...</span>
                      </div>
                    ) : comments[post.id] && comments[post.id].length > 0 ? (
                      <div className="space-y-4">
                        {comments[post.id].map((comment) => (
                          <div key={comment.id} className="flex items-start gap-3">
                            <CornerDownRight className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                            <div className="flex-grow">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">{comment.author}</p>
                                <p className="text-xs text-muted-foreground">
                                  &middot; {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                </p>
                              </div>
                              <p className="text-sm">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-center text-muted-foreground py-4">
                         No comments on this post yet.
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-20">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Posts Found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn't find any recent posts. Connect an account or create a new post to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
