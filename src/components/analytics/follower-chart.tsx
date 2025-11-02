
'use client';

import {
  Line,
  LineChart,
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
  followers: {
    label: 'Followers',
    color: 'hsl(var(--primary))',
  },
};

export function FollowerChart({ platform }: { platform?: 'Instagram' | 'Facebook' }) {
  const [chartData, setChartData] = useState<AnalyticsData[]>([]);
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  // Use real-time listener for accounts
  const { data: allAccounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);

  const accounts = useMemo(() => {
    if (!allAccounts) return [];
    if (platform) {
      return allAccounts.filter(acc => acc.platform === platform);
    }
    return allAccounts;
  }, [allAccounts, platform]);


  useEffect(() => {
    const generateChartData = () => {
      if (!accounts) {
        if (!isLoading) setChartData([]); // Clear data if loading is finished and there are no accounts
        return;
      }
      
      let totalFollowers = 0;
      accounts.forEach(account => {
        totalFollowers += account.followers || 0;
      });

      // Simulate historical data based on current followers from real-time data
      const data: AnalyticsData[] = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = subMonths(today, i);
        // Simulate a growth factor, less growth for older months
        const randomFactor = (1 - (Math.random() * 0.15 * (i / 6))); 
        const followers = Math.round(totalFollowers * randomFactor * (1 - (i * 0.05)));
        
        data.push({
          date: format(date, 'MMM'),
          followers: Math.max(0, followers), // Ensure followers are not negative
          engagement: 0, // Not used in this chart
        });
      }

      setChartData(data);
    };

    generateChartData();

  }, [accounts, isLoading]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Follower Growth</CardTitle>
        <CardDescription>
          Total follower count across all accounts (simulated historical data).
        </CardDescription>
      </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="h-[250px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : chartData.length > 0 && accounts.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
              >
                 <defs>
                  <linearGradient
                    id="fillFollowers"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--color-followers)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-followers)"
                      stopOpacity={0.1}
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
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(value)
                  }
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={<ChartTooltipContent indicator="dot" />} 
                />
                <Line
                  dataKey="followers"
                  type="monotone"
                  stroke="url(#fillFollowers)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{
                    r: 6,
                    style: { fill: "var(--color-followers)", opacity: 0.75 },
                  }}
                />
              </LineChart>
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
