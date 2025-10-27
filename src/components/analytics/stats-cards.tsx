'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BarChart, TrendingUp, Loader2 } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { useEffect, useState } from 'react';
import { fetchInstagramMedia, fetchFacebookPosts } from '@/app/actions';


interface OverallStats {
  totalFollowers: number;
  engagementRate: number;
  topAccount: string | null;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
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
  const { data: apiCredentials } = useCollection(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;


  useEffect(() => {
    const fetchOverallStats = async () => {
      if (!accounts || !userAccessToken) return;

      setIsLoading(true);
      let totalFollowers = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalPosts = 0;
      let topAccount: { name: string, followers: number } | null = null;

      for (const account of accounts) {
        let followers = 0;
        try {
          if (account.platform === 'Instagram') {
            const userDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${userAccessToken}`;
            const userDetailsResponse = await fetch(userDetailsUrl);
            if (userDetailsResponse.ok) {
              const userDetails = await userDetailsResponse.json();
              followers = userDetails.followers_count || 0;
            }

            const media = await fetchInstagramMedia({ instagramUserId: account.accountId, accessToken: userAccessToken });
            totalPosts += media.media.length;
            media.media.forEach((post: any) => {
              totalLikes += post.like_count || 0;
              totalComments += post.comments_count || 0;
            });

          } else if (account.platform === 'Facebook') {
            const pageDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${account.pageAccessToken}`;
            const pageDetailsResponse = await fetch(pageDetailsUrl);
            if (pageDetailsResponse.ok) {
              const pageDetails = await pageDetailsResponse.json();
              followers = pageDetails.followers_count || 0;
            }

            const postsData = await fetchFacebookPosts({ facebookPageId: account.accountId, pageAccessToken: account.pageAccessToken! });
            const posts = postsData.posts.filter((p: any) => p.likes);
            totalPosts += posts.length;
            posts.forEach((post: any) => {
              totalLikes += post.likes?.summary.total_count || 0;
              totalComments += post.comments?.summary.total_count || 0;
            });
          }
          
          totalFollowers += followers;
          if (!topAccount || followers > topAccount.followers) {
            topAccount = { name: account.displayName, followers };
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${account.displayName}`, error);
        }
      }

      const engagementRate = totalFollowers > 0 ? ((totalLikes + totalComments) / totalPosts / totalFollowers) * 100 : 0;

      setStats({
        totalFollowers,
        engagementRate,
        topAccount: topAccount?.name || null,
        totalLikes,
        totalComments,
        totalPosts,
      });
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      fetchOverallStats();
    } else if (!accounts && !isLoading) {
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, firestore, user, isLoading]);

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
