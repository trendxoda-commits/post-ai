
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
import type { SocialAccount, ApiCredential, AnalyticsData } from '@/lib/types';
import { subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { getAccountAnalytics } from '@/app/actions';

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
  const { data: apiCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;

  useEffect(() => {
    // Simulate historical data for the chart.
    const generateChartData = async () => {
       if (!accounts || !userAccessToken) {
        setIsLoading(false);
        setChartData([]); // Clear data if no accounts or token
        return;
      }
      
      setIsLoading(true);

      let totalFollowers = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalPosts = 0;

      const analyticsPromises = accounts.map(account => {
        const pageAccessToken = account.pageAccessToken;
        if (!pageAccessToken) return Promise.resolve(null);
        return getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: pageAccessToken,
            userAccessToken: userAccessToken,
        }).catch(() => null);
      });
      
      const results = await Promise.all(analyticsPromises);
      results.forEach(result => {
        if(result) {
            totalFollowers += result.followers;
            totalLikes += result.totalLikes;
            totalComments += result.totalComments;
            totalPosts += result.postCount;
        }
      });
      
      const totalInteractions = totalLikes + totalComments;
      const currentEngagementRate = totalPosts > 0 && totalFollowers > 0
        ? (totalInteractions / totalPosts / totalFollowers) * 100
        : 0;

      const data: AnalyticsData[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
          const date = subMonths(today, i);
          const randomFactor = (1 - (Math.random() * 0.4 * (i / 6)));
          const simulatedRate = currentEngagementRate * randomFactor;
          
          data.push({
            date: format(date, 'MMM'),
            engagement: parseFloat(Math.max(0, simulatedRate).toFixed(2)),
            followers: 0, // Not used
          });
      }
          
      setChartData(data);
      setIsLoading(false);
    };

     if (accounts && userAccessToken) {
        generateChartData();
    } else if (accounts === null && user) {
        // Still loading
    }
    else {
        setIsLoading(false);
        setChartData([]);
    }

  }, [accounts, userAccessToken, user]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Rate</CardTitle>
        <CardDescription>
          Average engagement rate (%) per post (simulated historical data).
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
                <p className="text-sm text-muted-foreground">No data to display.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
