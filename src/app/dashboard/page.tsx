'use client';

import { Feed } from '@/components/dashboard/feed';
import { SchedulePost } from '@/components/dashboard/schedule-post';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { SocialAccount, ScheduledPost as ScheduledPostType } from '@/lib/types';

function ScheduledPostsList() {
  const { firestore } = useFirebase();
  const { user } = useUser();

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
  
  if (isLoading) return <Card><CardHeader><CardTitle>Scheduled Posts</CardTitle></CardHeader><CardContent><p>Loading...</p></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Posts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scheduledPosts && scheduledPosts.length > 0 ? (
          scheduledPosts.map((post) => {
            const postAccounts = accounts?.filter(acc => post.socialAccountIds.includes(acc.id)) || [];
            return (
              <div key={post.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4 overflow-hidden">
                   <div className="flex -space-x-4">
                    {postAccounts.map(account => (
                      <Avatar key={account.id} className="h-10 w-10 border-2 border-card">
                        <AvatarImage src={account.avatar} alt={account.displayName} />
                        <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium truncate">{post.content}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(post.scheduledTime!), 'PPp')}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">Scheduled</Badge>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming posts scheduled.</p>
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
          <SchedulePost />
        </div>
        <Feed />
      </div>
      <div className="space-y-8 lg:mt-[76px]">
        <ScheduledPostsList />
      </div>
    </div>
  );
}
