
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Users, ThumbsUp, MessageCircle, Eye } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collectionGroup, getDocs } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { subMonths, format } from 'date-fns';

interface PlatformStats {
  name: string;
  followers: number;
  likes: number;
  comments: number;
  views: number;
}

interface GrowthData {
    date: string;
    followers: number;
}

const AdminStatsCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


export default function AdminAnalyticsPage() {
    const { firestore } = useFirebase();
    const [platformData, setPlatformData] = useState<PlatformStats[]>([]);
    const [growthData, setGrowthData] = useState<GrowthData[]>([]);
    const [totals, setTotals] = useState({ followers: 0, likes: 0, comments: 0, views: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const accountsQuery = collectionGroup(firestore, 'socialAccounts');
                const accountsSnapshot = await getDocs(accountsQuery);
                const allAccounts = accountsSnapshot.docs.map(doc => doc.data() as SocialAccount);

                const stats: Record<string, PlatformStats> = {
                    'Instagram': { name: 'Instagram', followers: 0, likes: 0, comments: 0, views: 0 },
                    'Facebook': { name: 'Facebook', followers: 0, likes: 0, comments: 0, views: 0 },
                };
                
                let totalFollowers = 0;
                let totalLikes = 0;
                let totalComments = 0;
                let totalViews = 0;

                allAccounts.forEach(account => {
                    if (stats[account.platform]) {
                        stats[account.platform].followers += account.followers || 0;
                        stats[account.platform].likes += account.totalLikes || 0;
                        stats[account.platform].comments += account.totalComments || 0;
                        stats[account.platform].views += account.totalViews || 0;
                        
                        totalFollowers += account.followers || 0;
                        totalLikes += account.totalLikes || 0;
                        totalComments += account.totalComments || 0;
                        totalViews += account.totalViews || 0;
                    }
                });

                setPlatformData(Object.values(stats));
                setTotals({ followers: totalFollowers, likes: totalLikes, comments: totalComments, views: totalViews });

                // Simulate historical growth data
                const growth: GrowthData[] = [];
                const today = new Date();
                for (let i = 6; i >= 0; i--) {
                    const date = subMonths(today, i);
                    const randomFactor = (1 - (Math.random() * 0.15 * (i / 6)));
                    const followers = Math.round(totalFollowers * randomFactor * (1 - (i * 0.05)));
                    growth.push({
                        date: format(date, 'MMM'),
                        followers: Math.max(0, followers),
                    });
                }
                setGrowthData(growth);

            } catch (error) {
                console.error("Failed to fetch admin analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Platform Analytics</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AdminStatsCard title="Total Followers" value={totals.followers.toLocaleString()} icon={Users} />
                <AdminStatsCard title="Total Likes" value={totals.likes.toLocaleString()} icon={ThumbsUp} />
                <AdminStatsCard title="Total Comments" value={totals.comments.toLocaleString()} icon={MessageCircle} />
                <AdminStatsCard title="Total Views" value={totals.views.toLocaleString()} icon={Eye} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Platform Performance</CardTitle>
                        <CardDescription>Comparison of key metrics between platforms.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={platformData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="followers" fill="hsl(var(--chart-1))" name="Followers" />
                                <Bar dataKey="likes" fill="hsl(var(--chart-2))" name="Likes" />
                                <Bar dataKey="comments" fill="hsl(var(--chart-3))" name="Comments" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Total Follower Growth</CardTitle>
                        <CardDescription>Simulated growth of total followers over time.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{
                                        background: "hsl(var(--card))",
                                        borderColor: "hsl(var(--border))",
                                    }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Followers" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
