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
import { analyticsData } from '@/lib/placeholder-data';
import {
  ChartTooltipContent,
  ChartContainer,
} from '@/components/ui/chart';

const chartConfig = {
  engagement: {
    label: 'Engagement',
    color: 'hsl(var(--accent))',
  },
};

export function EngagementChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engagement Rate</CardTitle>
        <CardDescription>
          Average engagement rate (%) per month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <BarChart
            data={analyticsData}
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
      </CardContent>
    </Card>
  );
}
