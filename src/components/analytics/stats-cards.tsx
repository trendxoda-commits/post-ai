
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, TrendingUp, Loader2 } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';


interface OverallStats {
  totalFollowers: number;
  engagementRate: number;
  topAccount: string | null;
}

export function StatsCards() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [stats, setStats] = useState<OverallStats | null>(null);

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  // Use the real-time hook
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);


  useEffect(() => {
    if (isLoading) {
      setStats(null); // Clear stats while loading
      return;
    }

    if (!accounts || accounts.length === 0) {
      setStats({ totalFollowers: 0, engagementRate: 0, topAccount: null });
      return;
    }

    let totalFollowers = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalPosts = 0;
    let topAccount: { name: string, followers: number } | null = null;
    
    for (const account of accounts) {
        totalFollowers += account.followers || 0;
        totalLikes += account.totalLikes || 0;
        totalComments += account.totalComments || 0;
        totalPosts += account.postCount || 0;

        if (!topAccount || (account.followers || 0) > topAccount.followers) {
          topAccount = { name: account.displayName, followers: account.followers || 0 };
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

  }, [accounts, isLoading]);

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
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Connect accounts to see data</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
                <BarChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold">0.00%</div>
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
          <div className="text-2xl font-bold">{(stats.totalFollowers || 0).toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Across all connected accounts</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg. Engagement Rate</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(stats.engagementRate || 0).toFixed(2)}%</div>
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
