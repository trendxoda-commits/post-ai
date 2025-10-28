'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, TrendingUp, Loader2 } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getAccountAnalytics } from '@/app/actions';


interface OverallStats {
  totalFollowers: number;
  engagementRate: number;
  topAccount: string | null;
}

export function StatsCards() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [stats, setStats] = useState<OverallStats | null>(null);
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
    const fetchOverallStats = async () => {
       if (!accounts || !userAccessToken) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      let totalFollowers = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalPosts = 0;
      let topAccount: { name: string, followers: number } | null = null;
      
      const analyticsPromises = accounts.map(account => {
        // CRITICAL FIX: Use the PAGE access token for this call.
        const accessTokenForRequest = account.pageAccessToken!;
        
        if (!accessTokenForRequest) {
            console.warn(`No access token available for ${account.displayName}. Skipping stats fetch.`);
            return Promise.resolve(null);
        }
        
        return getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            accessToken: accessTokenForRequest,
            userAccessToken: userAccessToken, // Pass user token for IG insights
        }).then(analytics => ({
            ...analytics,
            displayName: account.displayName
        })).catch(error => {
            console.error(`Failed to fetch analytics for ${account.displayName}`, error);
            return null;
        })
      });
      
      const results = await Promise.all(analyticsPromises);

      for (const result of results) {
          if (!result) continue;

          totalFollowers += result.followers;
          totalLikes += result.totalLikes;
          totalComments += result.totalComments;
          totalPosts += result.postCount;

          if (!topAccount || result.followers > topAccount.followers) {
            topAccount = { name: result.displayName, followers: result.followers };
          }
      }

      // ((Total Likes + Total Comments) / Total Posts) / Total Followers * 100
      const totalInteractions = totalLikes + totalComments;
      const engagementRate = totalPosts > 0 && totalFollowers > 0
        ? (totalInteractions / totalPosts / totalFollowers) * 100
        : 0;

      setStats({
        totalFollowers,
        engagementRate,
        topAccount: topAccount?.name || null,
      });
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      fetchOverallStats();
    } else if (accounts === null && user) {
        // Still loading accounts
    } else {
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, user]);

  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="h-4 bg-muted rounded w-2/4" />
                    </CardHeader>
                    <CardContent>
                       <div className="h-7 bg-muted rounded w-1/3 mb-2" />
                       <div className="h-3 bg-muted rounded w-3/4" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
  }

  if (!stats) {
    return (
         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">Connect accounts to see data</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                 <p className="text-xs text-muted-foreground">No posts to analyze</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Top Performing Account
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">No accounts connected</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalFollowers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Across all connected accounts</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Engagement Rate</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.engagementRate.toFixed(2)}%</div>
          <p className="text-xs text-muted-foreground">Based on recent posts</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Top Performing Account
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.topAccount || 'N/A'}</div>
          <p className="text-xs text-muted-foreground">Highest follower count</p>
        </CardContent>
      </Card>
    </div>
  );
}
