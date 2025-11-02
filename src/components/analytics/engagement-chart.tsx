
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
import { useEffect, useState, useMemo } from 'react';
import type { SocialAccount, AnalyticsData } from '@/lib/types';
import { subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const chartConfig = {
  engagement: {
    label: 'Engagement',
    color: 'hsl(var(--accent))',
  },
};

export function EngagementChart({ platform }: { platform?: 'Instagram' | 'Facebook' }) {
  const [chartData, setChartData] = useState<AnalyticsData[]>([]);
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  // Use real-time listener
  const { data: allAccounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);
  
  const accounts = useMemo(() => {
    if (!allAccounts) return [];
    if (platform) {
      return allAccounts.filter(acc => acc.platform === platform);
    }
    return allAccounts;
  }, [allAccounts, platform]);

  useEffect(() => {
    // Simulate historical data for the chart based on real-time data.
    const generateChartData = () => {
       if (!accounts) {
        if (!isLoading) setChartData([]); // Clear data if loading is finished and there are no accounts
        return;
      }
      
      let totalFollowers = 0;
      let totalLikes = 0;
      let totalComments = 0;
      let totalPosts = 0;

      accounts.forEach(account => {
        totalFollowers += account.followers || 0;
        totalLikes += account.totalLikes || 0;
        totalComments += account.totalComments || 0;
        totalPosts += account.postCount || 0;
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
    };

    generateChartData();

  }, [accounts, isLoading]);


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
         ) : chartData.length > 0 && accounts.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
            >
                <defs>
                  <linearGradient id="fillEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-engagement)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-engagement)"
                      stopOpacity={0.2}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
                <Tooltip 
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />} 
                />
                <Bar
                  dataKey="engagement"
                  fill="url(#fillEngagement)"
                  radius={[8, 8, 0, 0]}
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
