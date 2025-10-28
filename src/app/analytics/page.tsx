'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAccountAnalytics } from '@/app/actions';

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
  const [stats, setStats] = useState<AccountStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const apiCredentialsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null
  , [firestore, user]);
  const { data: apiCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;


  useEffect(() => {
    const fetchAccountStats = async () => {
      if (!accounts || !userAccessToken) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      
      const statsPromises = accounts.map(async (account) => {
        try {
          // IMPORTANT: Use the Page Access Token for Facebook pages, and the main User Access Token for Instagram
          const accessTokenForRequest = account.platform === 'Facebook' ? account.pageAccessToken! : userAccessToken;
          
          if (!accessTokenForRequest) {
            console.warn(`No access token available for ${account.displayName}. Skipping stats fetch.`);
            return null;
          }

          const analytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            accessToken: accessTokenForRequest,
          });

          const postCount = analytics.postCount > 0 ? analytics.postCount : 1; // Avoid division by zero
          return {
            id: account.id,
            displayName: account.displayName,
            avatar: account.avatar,
            platform: account.platform,
            followers: analytics.followers,
            avgLikes: Math.round(analytics.totalLikes / postCount),
            avgComments: Math.round(analytics.totalComments / postCount),
            avgViews: Math.round(analytics.totalViews / postCount),
          };
        } catch (error) {
          console.error(`Failed to fetch stats for ${account.displayName}`, error);
          return null; // Return null for failed fetches
        }
      });
      
      const allStats = (await Promise.all(statsPromises))
        .filter((stat): stat is AccountStats => stat !== null) // Filter out nulls
        .sort((a, b) => b.followers - a.followers);

      setStats(allStats);
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      fetchAccountStats();
    } else if (accounts === null && user) {
      // Still loading accounts, do nothing
    } else {
      // No accounts or no token
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, user]);


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
        ) : stats.length > 0 ? (
          stats.map((account) => (
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
    </div>
  );
}
