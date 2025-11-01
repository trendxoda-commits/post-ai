
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useFirebase,
  useUser,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, orderBy, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { ScheduledPost, SocialAccount } from '@/lib/types';
import { Loader2, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function ActivityPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const scheduledPostsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'users', user.uid, 'scheduledPosts'), orderBy('scheduledTime', 'desc'))
        : null,
    [firestore, user]
  );
  const { data: posts, isLoading } = useCollection<ScheduledPost>(scheduledPostsQuery);

  const socialAccountsQuery = useMemoFirebase(
    () =>
      user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);
  
  const postsWithAccountDetails = useMemo(() => {
    if (!posts || !accounts) return [];
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

    return posts.map(post => {
      const postAccounts = post.socialAccountIds.map(id => {
        const account = accountMap.get(id);
        return {
          displayName: account?.displayName || 'Unknown',
          platform: account?.platform || 'Unknown',
          avatar: account?.avatar
        };
      });
      return { ...post, accounts: postAccounts };
    });
  }, [posts, accounts]);

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    try {
        await doc(firestore, 'users', user.uid, 'scheduledPosts', postId).delete();
        toast({
            title: 'Post Deleted',
            description: 'The scheduled post has been removed.',
        });
    } catch (e) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete the post.',
        });
    }
  }
  
   const handleClearCompleted = async () => {
    if (!user) return;
    const q = query(collection(firestore, 'users', user.uid, 'scheduledPosts'), where('status', 'in', ['completed', 'failed']));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
        toast({ description: "No completed or failed jobs to clear."});
        return;
    }
    const batch = writeBatch(firestore);
    snapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    toast({ title: 'Cleared!', description: 'Completed and failed jobs have been cleared.' });
  };


  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'scheduled':
              return <Badge variant="secondary"><Calendar className="h-3 w-3 mr-1" />Scheduled</Badge>;
          case 'processing':
              return <Badge variant="default"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
          case 'completed':
              return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
          case 'failed':
              return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
          default:
              return <Badge variant="outline">Unknown</Badge>
      }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">Activity</h1>
            <p className="text-muted-foreground max-w-2xl">
                Track your scheduled posts and the status of posts sent with "Post Now".
            </p>
        </div>
        <Button variant="outline" onClick={handleClearCompleted}>Clear Completed</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Activity</CardTitle>
          <CardDescription>A log of your past, present, and future posting activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Content</TableHead>
                    <TableHead>Destinations</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {postsWithAccountDetails && postsWithAccountDetails.length > 0 ? (
                    postsWithAccountDetails.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell>
                          <p className="max-w-xs truncate">{post.content || "No caption"}</p>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center space-x-2">
                                {post.accounts?.map((acc, index) => (
                                    <Avatar key={index} className="h-6 w-6">
                                        <AvatarImage src={acc.avatar} />
                                        <AvatarFallback>{acc.displayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                ))}
                            </div>
                        </TableCell>
                         <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(post.scheduledTime), 'PP')}
                                <Clock className="h-4 w-4" />
                                {format(new Date(post.scheduledTime), 'p')}
                            </div>
                        </TableCell>
                        <TableCell>
                            {getStatusBadge(post.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={post.status === 'processing'}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the
                                  scheduled post.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeletePost(post.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No activity found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
