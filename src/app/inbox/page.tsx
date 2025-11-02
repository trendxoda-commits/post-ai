
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import type { SocialComment, SocialPost, SocialAccount } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { replyToFacebookComment, replyToInstagramComment } from '../actions';


function CommentReply({ comment }: { comment: SocialComment }) {
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();

    const socialAccountsQuery = useMemoFirebase(
        () => comment.userId ? collection(firestore, 'users', comment.userId, 'socialAccounts') : null,
        [firestore, comment.userId]
    );
    const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);
    
    const pageAccessToken = useMemo(() => {
        if (!accounts) return null;
        const account = accounts.find(a => a.id === comment.socialAccountId);
        return account?.pageAccessToken;
    }, [accounts, comment.socialAccountId]);


    const handleReply = async () => {
        if (!replyText || !pageAccessToken) {
            toast({
                variant: 'destructive',
                title: 'Cannot Reply',
                description: !pageAccessToken ? 'Page access token not found.' : 'Reply text cannot be empty.',
            });
            return;
        }
        setIsReplying(true);

        try {
            const replyInput = {
                commentId: comment.commentId,
                message: replyText,
                accessToken: pageAccessToken,
            };

            if (comment.platform === 'Instagram') {
                await replyToInstagramComment(replyInput);
            } else {
                await replyToFacebookComment(replyInput);
            }

            toast({
                title: 'Reply Sent!',
                description: 'Your reply has been posted successfully.',
            });
            setReplyText('');
        } catch (error: any) {
            console.error('Failed to send reply:', error);
            toast({
                variant: 'destructive',
                title: 'Reply Failed',
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setIsReplying(false);
        }
    };
    
    return (
         <div className="flex items-start gap-4 pt-4">
            <Avatar className="h-9 w-9 border">
                <AvatarImage src={comment.account?.avatar} />
                <AvatarFallback>{comment.account?.displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="grid w-full gap-2">
                <Textarea
                    placeholder={`Reply to ${comment.from.name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                />
                <Button onClick={handleReply} disabled={isReplying} className="justify-self-end">
                    {isReplying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Reply
                </Button>
            </div>
        </div>
    )
}

export default function InboxPage() {
    const { firestore } = useFirebase();
    const { user } = useUser();

    const commentsQuery = useMemoFirebase(
        () => user ? query(collection(firestore, 'users', user.uid, 'socialComments'), orderBy('timestamp', 'desc')) : null,
        [firestore, user]
    );
    const { data: comments, isLoading: isLoadingComments } = useCollection<SocialComment>(commentsQuery);
    
    const postsQuery = useMemoFirebase(
        () => user ? collection(firestore, 'users', user.uid, 'socialPosts') : null,
        [firestore, user]
    );
    const { data: posts } = useCollection<SocialPost>(postsQuery);

    const accountsQuery = useMemoFirebase(
        () => user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
        [firestore, user]
    );
    const { data: accounts } = useCollection<SocialAccount>(accountsQuery);

    // Join data client-side once it's loaded
    const enrichedComments = useMemo(() => {
        if (!comments || !posts || !accounts) return [];
        
        const postsMap = new Map(posts.map(p => [p.id, p]));
        const accountsMap = new Map(accounts.map(a => [a.id, a]));

        return comments.map(comment => ({
            ...comment,
            post: postsMap.get(comment.socialPostId),
            account: accountsMap.get(comment.socialAccountId),
        }));
    }, [comments, posts, accounts]);


    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Comments Inbox</h1>
                <p className="text-muted-foreground">
                    View and reply to comments from all your connected accounts in one place.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Comments</CardTitle>
                    <CardDescription>
                        Comments from your Facebook and Instagram posts, sorted by most recent.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingComments ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : enrichedComments.length > 0 ? (
                        <div className="space-y-8">
                            {enrichedComments.map((comment) => (
                                <div key={comment.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 border-b pb-6 last:border-b-0 last:pb-0">
                                    {/* Left side: Post Context */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-sm">In response to:</h4>
                                        <div className="rounded-lg border p-3 bg-muted/50 space-y-3">
                                            {comment.post?.mediaUrl && (
                                                <div className="aspect-square relative w-full overflow-hidden rounded-md">
                                                    <Image src={comment.post.mediaUrl} alt="Post media" fill className="object-cover" />
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground line-clamp-3">
                                                {comment.post?.content || "No post caption."}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Right side: Comment Thread */}
                                    <div className="flex flex-col">
                                        <div className="flex items-start gap-4">
                                            <Avatar className="h-9 w-9">
                                                {/* Placeholder for commenter avatar */}
                                                <AvatarFallback>{comment.from?.name?.charAt(0) || '?'}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid w-full">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-semibold">{comment.from?.name || 'Unknown User'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                                    </div>
                                                </div>
                                                <div className="text-sm prose prose-sm max-w-none">
                                                    <p>{comment.text}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Reply Component */}
                                        <CommentReply comment={comment} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-20">
                            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No Comments Yet</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                We haven't found any comments on your recent posts. Try reconnecting your account.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
