'use client';

import { Feed } from '@/components/dashboard/feed';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { ScheduledPost } from '@/lib/types';
import { format } from 'date-fns';


function ScheduledPosts() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const scheduledPostsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'users', user.uid, 'scheduledPosts'),
            where('scheduledTime', '>=', new Date().toISOString()),
            orderBy('scheduledTime', 'asc')
          )
        : null,
    [firestore, user]
  );
  const { data: scheduledPosts, isLoading } = useCollection<ScheduledPost>(scheduledPostsQuery);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Posts</CardTitle>
        <CardDescription>Your upcoming scheduled posts.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-sm text-muted-foreground">Loading...</div>
        ) : scheduledPosts && scheduledPosts.length > 0 ? (
          <div className="space-y-4">
            {scheduledPosts.slice(0, 5).map(post => (
              <div key={post.id} className="flex items-start gap-4">
                <div className="bg-muted rounded-md p-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-sm truncate">{post.content || 'Untitled Post'}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(post.scheduledTime), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">No posts scheduled.</div>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <Button asChild>
            <Link href="/create-post">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <Feed />
            </div>
            <div className="lg:col-span-1 space-y-8">
              <ScheduledPosts />
            </div>
        </div>
    </div>
  );
}
