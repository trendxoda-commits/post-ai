
'use client';

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2, MessageSquare, CornerDownRight } from 'lucide-react';
import type { SocialPost, ApiCredential, SocialAccount } from '@/lib/types';
import {
  fetchInstagramComments,
  getFacebookPostComments,
} from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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

  const [comments, setComments] = useState<Record<string, UnifiedComment[]>>({});
  const [isLoadingComments, setIsLoadingComments] = useState<Record<string, boolean>>({});
  const [openPostId, setOpenPostId] = useState<string | null>(null);

  // Fetch social posts from the new collection
  const socialPostsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialPosts'), orderBy('timestamp', 'desc')) : null,
    [firestore, user]
  );
  const { data: posts, isLoading: isLoadingPosts } = useCollection<SocialPost>(socialPostsQuery);
  
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
        displayName: accountsMap.get(post.socialAccountId)?.displayName || 'Unknown Account',
        avatar: accountsMap.get(post.socialAccountId)?.avatar
      }
    }));
  }, [posts, accounts]);


  const handlePostToggle = async (postId: string) => {
    if (openPostId === postId) {
      setOpenPostId(null);
      return;
    }

    setOpenPostId(postId);

    // Fetch comments if not already fetched
    if (!comments[postId]) {
      setIsLoadingComments((prev) => ({ ...prev, [postId]: true }));
      const post = posts?.find((p) => p.id === postId);
      const account = accounts?.find(a => a.id === post?.socialAccountId);
      
      if (!post || !account || !account.pageAccessToken) {
        setIsLoadingComments((prev) => ({ ...prev, [postId]: false }));
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not find post or required account token to fetch comments.'
        });
        return;
      };

      try {
        let fetchedComments: UnifiedComment[] = [];
        if (post.platform === 'Instagram') {
          const { comments: igComments } = await fetchInstagramComments({
            mediaId: post.postId, // Use the original platform-specific post ID
            accessToken: account.pageAccessToken,
          });
          fetchedComments = igComments.map((c: any) => ({
            id: c.id,
            author: c.from.username,
            text: c.text,
            timestamp: c.timestamp,
          }));
        } else if (post.platform === 'Facebook') {
          const { comments: fbComments } = await getFacebookPostComments({
             postId: post.postId, // Use the original platform-specific post ID
             accessToken: account.pageAccessToken,
          });
           fetchedComments = fbComments.map((c: any) => ({
            id: c.id,
            author: c.from.name,
            text: c.message,
            timestamp: c.created_time,
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
          View and reply to comments from your connected social accounts. Click on a post to see its comments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Posts & Comments</CardTitle>
          <CardDescription>
            A feed of your recent posts from the database. Click on any post to load and view its comments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPosts ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : postsWithAccountData && postsWithAccountData.length > 0 ? (
            <Accordion
              type="single"
              collapsible
              value={openPostId || ''}
              onValueChange={handlePostToggle}
            >
              {postsWithAccountData.map((post) => (
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
                            <AvatarImage src={post.account?.avatar} alt={post.account?.displayName} />
                            <AvatarFallback>{post.account?.displayName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-sm">{post.account?.displayName}</p>
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
                We couldn't find any recent posts on your connected accounts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    