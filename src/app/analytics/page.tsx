
'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { PostPerformance } from '@/components/analytics/post-performance';

// Interface for aggregated stats per account
export interface AccountStats {
  id: string;
  displayName: string;
  avatar?: string;
  platform: 'Instagram' | 'Facebook';
  followers: number;
  avgLikes: number;
  avgComments: number;
  avgViews: number;
}

function AccountPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialAccounts'), orderBy('followers', 'desc')) : null,
    [firestore, user]
  );
  // Use the real-time hook
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);

  const accountStats = useMemo(() => {
    if (!accounts) return [];
    
    return accounts.map(account => {
        const postCount = (account.postCount || 0) > 0 ? account.postCount! : 1;
        return {
            id: account.id,
            displayName: account.displayName,
            avatar: account.avatar,
            platform: account.platform,
            followers: account.followers || 0,
            avgLikes: Math.round((account.totalLikes || 0) / postCount),
            avgComments: Math.round((account.totalComments || 0) / postCount),
            avgViews: Math.round((account.totalViews || 0) / postCount),
        };
    });
  }, [accounts]);


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
        ) : accountStats.length > 0 ? (
          accountStats.map((account) => (
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
                  {(account.followers || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{(account.avgLikes || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg. Likes</p>
              </div>
               <div className="text-right">
                <p className="font-semibold">{(account.avgComments || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg. Comments</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{(account.avgViews || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg. Views</p>
              </div>
            </div>
          ))
        ) : (
            <p className="text-sm text-center text-muted-foreground py-4">No accounts connected or data available.</p>
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
       <PostPerformance />
    </div>
  );
}
