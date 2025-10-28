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
import type { SocialAccount, ApiCredential, AnalyticsData } from '@/lib/types';
import { subMonths, format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { getAccountAnalytics } from '@/app/actions';

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
  const { data: apiCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;


  useEffect(() => {
    const generateChartData = async () => {
      if (!accounts || accounts.length === 0 || !userAccessToken) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      let totalFollowers = 0;
      const analyticsPromises = accounts.map(account => {
        const pageAccessToken = account.pageAccessToken!;

        if (!pageAccessToken) {
            console.warn(`No access token available for ${account.displayName}. Skipping follower count.`);
            return Promise.resolve(null);
        }

        return getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: pageAccessToken,
            userAccessToken: userAccessToken,
        }).catch(e => {
            console.error(`Failed to get followers for ${account.displayName}`, e);
            return null;
        })
      });
      
      const results = await Promise.all(analyticsPromises);
      results.forEach(result => {
        if(result) totalFollowers += result.followers;
      });


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

    if (accounts && userAccessToken) {
        generateChartData();
    } else if (accounts === null && user) {
        // Still loading accounts
    }
    else {
        setIsLoading(false);
    }
  }, [accounts, userAccessToken, user]);


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
