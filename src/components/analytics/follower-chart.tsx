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
import { useEffect, useState } from 'react';
import type { SocialAccount, AnalyticsData } from '@/lib/types';
import { subMonths, format, startOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';

const chartConfig = {
  followers: {
    label: 'Followers',
    color: 'hsl(var(--primary))',
  },
};

export function FollowerChart() {
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
      
      let totalFollowers = 0;
      for (const account of accounts) {
         try {
          if (account.platform === 'Instagram') {
            const userDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${userAccessToken}`;
            const userDetailsResponse = await fetch(userDetailsUrl);
            if (userDetailsResponse.ok) {
              const userDetails = await userDetailsResponse.json();
              totalFollowers += userDetails.followers_count || 0;
            }
          } else if (account.platform === 'Facebook') {
            const pageDetailsUrl = `https://graph.facebook.com/v20.0/${account.accountId}?fields=followers_count&access_token=${account.pageAccessToken}`;
            const pageDetailsResponse = await fetch(pageDetailsUrl);
            if (pageDetailsResponse.ok) {
              const pageDetails = await pageDetailsResponse.json();
              totalFollowers += pageDetails.followers_count || 0;
            }
          }
         } catch (e) {
            console.error("Could not fetch follower data", e)
         }
      }

      // Simulate historical data based on current followers
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
      setIsLoading(false);
    };

    generateChartData();
  }, [accounts, userAccessToken]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Follower Growth</CardTitle>
        <CardDescription>
          Total follower count across all accounts over the last 7 months (simulated historical data).
        </CardDescription>
      </CardHeader>
      <CardContent>
         {isLoading ? (
            <div className="h-[250px] w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
         ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart
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
                  tickFormatter={(value) =>
                    new Intl.NumberFormat('en-US', {
                      notation: 'compact',
                      compactDisplay: 'short',
                    }).format(value)
                  }
                />
                <Tooltip content={<ChartTooltipContent indicator="dot" />} />
                <Line
                  dataKey="followers"
                  type="monotone"
                  stroke="var(--color-followers)"
                  strokeWidth={2}
                  dot={false}
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
