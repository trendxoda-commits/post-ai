'use client';

import { Feed } from '@/components/dashboard/feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';
import { MoreVertical, Edit, Trash, Clock, Eye, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, ScheduledPost as ScheduledPostType } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function ScheduledPostsList() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [selectedPost, setSelectedPost] = useState<ScheduledPostType | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const scheduledPostsQuery = useMemoFirebase(() => 
    user ? query(
      collection(firestore, 'users', user.uid, 'scheduledPosts'),
      where('scheduledTime', '>=', new Date().toISOString()),
      orderBy('scheduledTime', 'asc'),
      limit(5)
    ) : null,
    [firestore, user]
  );
  const { data: scheduledPosts, isLoading } = useCollection<ScheduledPostType>(scheduledPostsQuery);

  const socialAccountsQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const handleDelete = async (postId: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(firestore, 'users', user.uid, 'scheduledPosts', postId));
      toast({ title: 'Post Deleted', description: 'The scheduled post has been deleted.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete post.' });
    }
  };

  const handleEdit = (post: ScheduledPostType) => {
    // You can implement an edit modal or redirect to edit page
    router.push(`/create-post?edit=${post.id}`);
  };

  const handleView = (post: ScheduledPostType) => {
    // Open preview modal
    setSelectedPost(post);
    // You can implement a preview modal here
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Posts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Posts
          </div>
          {scheduledPosts && scheduledPosts.length > 0 && (
            <Badge variant="outline">{scheduledPosts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scheduledPosts && scheduledPosts.length > 0 ? (
          scheduledPosts.map((post) => {
            const postAccounts = accounts?.filter(acc => 
              post.socialAccountIds.includes(acc.id)
            ) || [];
            
            return (
              <div 
                key={post.id} 
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 overflow-hidden flex-1">
                  <div className="flex -space-x-2">
                    {postAccounts.map(account => (
                      <Avatar key={account.id} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={account.avatar} alt={account.displayName} />
                        <AvatarFallback className="text-xs">
                          {account.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="overflow-hidden flex-1">
                    <p className="font-medium truncate text-sm">
                      {post.content.length > 50 
                        ? `${post.content.substring(0, 50)}...` 
                        : post.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(post.scheduledTime!), 'MMM d, h:mm a')}
                      </p>
                      {post.mediaUrl && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          1 media
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs hidden sm:inline-flex"
                  >
                    Scheduled
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(post)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(post)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(post.id)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              No upcoming posts scheduled
            </p>
            <Button asChild>
              <Link href="/create-post">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create a Post
              </Link>
            </Button>
          </div>
        )}
        
        {scheduledPosts && scheduledPosts.length > 0 && (
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
          >
            View All Scheduled Posts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <Button asChild>
            <Link href="/create-post">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
        <Feed />
      </div>
      <div className="space-y-8 lg:mt-[76px]">
        <ScheduledPostsList />
      </div>
    </div>
  );
}
