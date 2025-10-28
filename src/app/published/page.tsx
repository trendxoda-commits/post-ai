'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ScheduledPost, SocialAccount } from '@/lib/types';
import Image from 'next/image';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';


function PublishedPostCard({ post, allAccounts }: { post: ScheduledPost, allAccounts: SocialAccount[] }) {
    const postAccounts = allAccounts.filter(acc => post.socialAccountIds.includes(acc.id));

    const getStatusVariant = () => {
        switch (post.status) {
            case 'published': return 'default';
            case 'failed': return 'destructive';
            case 'scheduled': return 'secondary';
            default: return 'outline';
        }
    }

     const getStatusIcon = () => {
        switch (post.status) {
            case 'published': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'scheduled': return <Clock className="h-4 w-4 text-yellow-500" />;
            default: return null;
        }
    }


    return (
        <Card className="flex flex-col">
            <CardHeader>
                 <div className="relative aspect-video w-full rounded-md overflow-hidden">
                    <Image
                        src={post.mediaUrl}
                        alt="Post media"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                 <p className="text-sm text-muted-foreground line-clamp-4">
                    {post.content || 'No caption.'}
                </p>
            </CardContent>
            <div className="p-4 pt-0 border-t mt-4">
                 <div className="flex items-center justify-between mb-3 pt-4">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">STATUS</p>
                        <Badge variant={getStatusVariant()} className="capitalize mt-1">
                            {getStatusIcon()}
                            <span className="ml-1.5">{post.status}</span>
                        </Badge>
                    </div>
                     <div>
                        <p className="text-xs font-semibold text-muted-foreground text-right">SCHEDULED FOR</p>
                        <p className="text-sm font-medium mt-1 text-right">
                           {format(new Date(post.scheduledTime), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                    </div>
                </div>

                <div className="border-t pt-3 mt-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">TARGETED ACCOUNTS</p>
                    <div className="flex items-center space-x-2">
                    <TooltipProvider>
                    {postAccounts.map(acc => (
                         <Tooltip key={acc.id}>
                            <TooltipTrigger>
                               <Avatar className="h-8 w-8">
                                    <AvatarImage src={acc.avatar} alt={acc.displayName} />
                                    <AvatarFallback>{acc.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{acc.displayName} ({acc.platform})</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                     </TooltipProvider>
                    </div>
                </div>
            </div>
        </Card>
    )
}


export default function PublishedPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const scheduledPostsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'users', user.uid, 'scheduledPosts'), where('status', 'in', ['published', 'failed'])) : null),
    [firestore, user]
  );
  const { data: posts, isLoading: isLoadingPosts } = useCollection<ScheduledPost>(scheduledPostsQuery);
  
  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const isLoading = isLoadingPosts || isLoadingAccounts;

  const sortedPosts = useMemo(() => {
    if (!posts) return [];
    return [...posts].sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());
  }, [posts]);


  return (
    <div className="space-y-8">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold font-headline">Post History</h1>
            <p className="text-muted-foreground max-w-2xl">
              A log of all your posts that have been published or have failed, sorted by the most recent.
            </p>
        </div>

         {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedPosts && sortedPosts.length > 0 && accounts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedPosts.map((post) => (
                <PublishedPostCard key={post.id} post={post} allAccounts={accounts} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 rounded-lg border-2 border-dashed">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Post History Yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Posts that have been published or failed will appear here.
            </p>
          </div>
        )}

    </div>
  );
}
