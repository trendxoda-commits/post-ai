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
import { subMonths, format } from 'date-fns';
import { fetchInstagramMedia, fetchFacebookPosts } from '@/app/actions';
import { Loader2 } from 'lucide-react';

const chartConfig = {
  engagement: {
    label: 'Engagement',
    color: 'hsl(var(--accent))',
  },
};

// This chart will show simulated data as historical engagement rate is complex to get accurately.
// Real-time stats are shown in other components.
export function EngagementChart() {
  const [chartData, setChartData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate historical data for the chart.
    const today = new Date();
    const data: AnalyticsData[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = subMonths(today, i);
        // Simulate a plausible engagement rate between 1% and 5%
        const randomEngagement = 1 + (Math.random() * 4); 
        
        data.push({
          date: format(date, 'MMM'),
          engagement: parseFloat(randomEngagement.toFixed(2)),
          followers: 0, // Not used
        });
      }
      
    setChartData(data);
    setIsLoading(false);
  }, []);


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
