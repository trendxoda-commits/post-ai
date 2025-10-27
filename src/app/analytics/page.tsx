'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';

function AccountPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);
  
  // Dummy engagement data since we don't have this in Firestore yet.
  const getEngagementRate = (accountId: string) => {
    // simple hash to get a "stable" random number
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
        const char = accountId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return (1 + (Math.abs(hash) % 40) / 10).toFixed(1); // Engagement between 1.0 and 5.0
  }
  
  // Dummy follower data
   const getFollowerCount = (accountId: string) => {
    let hash = 0;
    for (let i = 0; i < accountId.length; i++) {
        const char = accountId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.floor(1000 + (Math.abs(hash) % 20000));
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : accounts && accounts.length > 0 ? (
          accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={account.avatar} alt={account.displayName} />
                  <AvatarFallback>
                    {account.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{account.displayName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {getFollowerCount(account.id).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{getEngagementRate(account.id)}%</p>
                <p className="text-sm text-muted-foreground">Engagement</p>
              </div>
            </div>
          ))
        ) : (
            <p className="text-sm text-center text-muted-foreground py-4">No accounts connected.</p>
        )}
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
