'use client';

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { SocialAccount, AnalyticsData } from '@/lib/types';
import { subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { fetchInstagramMedia, fetchFacebookPosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';

const chartConfig = {
  engagement: {
    label: 'Engagement',
    color: 'hsl(var(--accent))',
  },
};

export function EngagementChart() {
  const [chartData, setChartData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { firestore } = useFirebase();
  const { user } = useUser();

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
    const generateChartData = async () => {
      if (!accounts || accounts.length === 0 || !userAccessToken) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      const today = new Date();
      const monthlyData: { [key: string]: { interactions: number; postCount: number, followers: number } } = {};

      // Initialize months
      for (let i = 6; i >= 0; i--) {
        const date = subMonths(today, i);
        const monthKey = format(date, 'MMM');
        monthlyData[monthKey] = { interactions: 0, postCount: 0, followers: 0 };
      }

      for (const account of accounts) {
        let currentFollowers = 0;
        try {
            if (account.platform === 'Instagram') {
                const userDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${userAccessToken}`;
                const userDetailsResponse = await fetch(userDetailsUrl);
                if (userDetailsResponse.ok) currentFollowers = (await userDetailsResponse.json()).followers_count || 0;

                const media = await fetchInstagramMedia({ instagramUserId: account.accountId, accessToken: userAccessToken });
                media.media.forEach((post: any) => {
                    const postDate = new Date(post.timestamp);
                    const monthKey = format(postDate, 'MMM');
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].interactions += (post.like_count || 0) + (post.comments_count || 0);
                        monthlyData[monthKey].postCount++;
                        monthlyData[monthKey].followers += currentFollowers; // Simplified assumption
                    }
                });
            } else if (account.platform === 'Facebook') {
                const pageDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${account.pageAccessToken}`;
                const pageDetailsResponse = await fetch(pageDetailsUrl);
                if (pageDetailsResponse.ok) currentFollowers = (await pageDetailsResponse.json()).followers_count || 0;

                const postsData = await fetchFacebookPosts({ facebookPageId: account.accountId, pageAccessToken: account.pageAccessToken! });
                postsData.posts.forEach((post: any) => {
                    const postDate = new Date(post.created_time);
                    const monthKey = format(postDate, 'MMM');
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].interactions += (post.likes?.summary.total_count || 0) + (post.comments?.summary.total_count || 0);
                        monthlyData[monthKey].postCount++;
                        monthlyData[monthKey].followers += currentFollowers; // Simplified assumption
                    }
                });
            }
        } catch (e) {
            console.error("Failed to fetch engagement data", e);
        }
      }

      const finalChartData = Object.keys(monthlyData).map(monthKey => {
        const month = monthlyData[monthKey];
        const avgFollowers = month.postCount > 0 ? month.followers / month.postCount : 1;
        const rate = (month.postCount > 0 && avgFollowers > 0) 
            ? ((month.interactions / month.postCount) / avgFollowers) * 100
            : 0;

        return {
            date: monthKey,
            engagement: parseFloat(rate.toFixed(2)),
            followers: 0, // Not used
        };
      });

      setChartData(finalChartData);
      setIsLoading(false);
    };

    generateChartData();
  }, [accounts, userAccessToken]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Rate</CardTitle>
        <CardDescription>
          Average engagement rate (%) per post per month.
        </CardDescription>
      </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="h-[250px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                />
                <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar
                dataKey="engagement"
                fill="var(--color-engagement)"
                radius={[4, 4, 0, 0]}
                />
            </BarChart>
            </ChartContainer>
        ) : (
            <div className="h-[250px] w-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data to display. Connect an account.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
