import { Feed } from '@/components/dashboard/feed';
import { SchedulePost } from '@/components/dashboard/schedule-post';
import { posts, scheduledPosts, accounts } from '@/lib/placeholder-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function ScheduledPostsList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scheduled Posts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {scheduledPosts.map((post) => {
          const account = accounts.find((a) => a.id === post.accountId);
          return (
            <div key={post.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={account?.avatar} alt={account?.username} />
                  <AvatarFallback>{account?.username.charAt(0)}</AvatarFallback>
                </Avatar>
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
        })}
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
        <Feed posts={posts} accounts={accounts} />
      </div>
      <div className="space-y-8 lg:mt-[76px]">
        <ScheduledPostsList />
      </div>
    </div>
  );
}
