'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchInstagramMedia, fetchFacebookPosts } from '@/app/actions';

// Interface for aggregated stats per account
interface AccountStats {
  id: string;
  displayName: string;
  avatar?: string;
  platform: 'Instagram' | 'Facebook';
  followers: number;
  avgLikes: number;
  avgComments: number;
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
  const { data: apiCredentials } = useCollection(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;


  useEffect(() => {
    const fetchAccountStats = async () => {
      if (!accounts || !userAccessToken) return;

      setIsLoading(true);
      const allStats: AccountStats[] = [];

      for (const account of accounts) {
        let followers = 0;
        let totalLikes = 0;
        let totalComments = 0;
        let postCount = 0;

        try {
            if (account.platform === 'Instagram') {
                // Fetch follower count
                const userDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${userAccessToken}`;
                const userDetailsResponse = await fetch(userDetailsUrl);
                if (userDetailsResponse.ok) {
                    const userDetails = await userDetailsResponse.json();
                    followers = userDetails.followers_count || 0;
                }
                
                // Fetch media to calculate engagement
                const media = await fetchInstagramMedia({
                    instagramUserId: account.accountId,
                    accessToken: userAccessToken,
                });
                postCount = media.media.length;
                media.media.forEach((post: any) => {
                    totalLikes += post.like_count || 0;
                    totalComments += post.comments_count || 0;
                });

            } else if (account.platform === 'Facebook') {
                // Fetch follower count
                const pageDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${account.pageAccessToken}`;
                const pageDetailsResponse = await fetch(pageDetailsUrl);
                 if (pageDetailsResponse.ok) {
                    const pageDetails = await pageDetailsResponse.json();
                    followers = pageDetails.followers_count || 0;
                }
                
                // Fetch posts to calculate engagement
                const postsData = await fetchFacebookPosts({
                    facebookPageId: account.accountId,
                    pageAccessToken: account.pageAccessToken!,
                });
                const posts = postsData.posts.filter((p: any) => p.likes); // filter out posts without stats
                postCount = posts.length;
                posts.forEach((post: any) => {
                    totalLikes += post.likes?.summary.total_count || 0;
                    totalComments += post.comments?.summary.total_count || 0;
                });
            }

            allStats.push({
                id: account.id,
                displayName: account.displayName,
                avatar: account.avatar,
                platform: account.platform,
                followers,
                avgLikes: postCount > 0 ? Math.round(totalLikes / postCount) : 0,
                avgComments: postCount > 0 ? Math.round(totalComments / postCount) : 0,
            });

        } catch (error) {
            console.error(`Failed to fetch stats for ${account.displayName}`, error);
        }
      }
      
      setStats(allStats.sort((a, b) => b.followers - a.followers));
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      fetchAccountStats();
    } else if (accounts === null && user) {
      // Still loading accounts
    } else {
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, user, firestore]);


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
                  {account.followers.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{account.avgLikes.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg. Likes</p>
              </div>
               <div className="text-right">
                <p className="font-semibold">{account.avgComments.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Avg. Comments</p>
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
