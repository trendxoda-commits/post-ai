import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { accounts } from '@/lib/placeholder-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function AccountPerformance() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={account.avatar} alt={account.username} />
                <AvatarFallback>
                  {account.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold">{account.username}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">
                {account.followers.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">{account.engagementRate}%</p>
              <p className="text-sm text-muted-foreground">Engagement</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Analytics Overview</h1>
      <StatsCards />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <FollowerChart />
          <EngagementChart />
        </div>
        <div className="lg:col-span-2">
          <AccountPerformance />
        </div>
      </div>
    </div>
  );
}
