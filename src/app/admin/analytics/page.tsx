'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Users, ThumbsUp, MessageCircle, Eye, FileText } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PlatformStats {
  name: string;
  followers: number;
  likes: number;
  comments: number;
  views: number;
  posts: number;
  users: number; // Add users to track platform-specific user connections if needed
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

const PlatformAnalytics = ({ accounts, totalUsers }: { accounts: SocialAccount[], totalUsers: number }) => {
    
    const totals = useMemo(() => {
        let stats: Omit<PlatformStats, 'name' | 'users'> = { followers: 0, likes: 0, comments: 0, views: 0, posts: 0 };
        accounts.forEach(account => {
            stats.followers += account.followers || 0;
            stats.likes += account.totalLikes || 0;
            stats.comments += account.totalComments || 0;
            stats.views += account.totalViews || 0;
            stats.posts += account.postCount || 0;
        });
        return stats;
    }, [accounts]);

    const growthData = useMemo(() => {
        const growth: GrowthData[] = [];
        const today = new Date();
        const baseFollowers = totals.followers * 0.7; // Start from 70% of current total
        const monthlyGrowth = (totals.followers * 0.3) / 6; // Distribute the remaining 30% over 6 months

        for (let i = 6; i >= 0; i--) {
            const date = subMonths(today, i);
            // This logic ensures a steady, logical growth progression
            const followers = Math.round(baseFollowers + (monthlyGrowth * (6 - i)));
            
            growth.push({
                date: format(date, 'MMM'),
                followers: Math.max(0, followers),
            });
        }
        return growth;
    }, [totals.followers]);


     if (accounts.length === 0) {
        return <p className="text-center text-muted-foreground py-10">No accounts connected for this platform yet.</p>;
    }


    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <AdminStatsCard title="Total Followers" value={totals.followers.toLocaleString()} icon={Users} />
                <AdminStatsCard title="Total Likes" value={totals.likes.toLocaleString()} icon={ThumbsUp} />
                <AdminStatsCard title="Total Comments" value={totals.comments.toLocaleString()} icon={MessageCircle} />
                <AdminStatsCard title="Total Views" value={totals.views.toLocaleString()} icon={Eye} />
                <AdminStatsCard title="Total Posts" value={totals.posts.toLocaleString()} icon={FileText} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Follower Growth</CardTitle>
                    <CardDescription>Simulated growth of total followers over time for this platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={growthData}>
                             <defs>
                                <linearGradient id="adminFollowersGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis 
                                 tickFormatter={(value) =>
                                    new Intl.NumberFormat('en-US', {
                                    notation: 'compact',
                                    compactDisplay: 'short',
                                    }).format(value)
                                }
                            />
                            <Tooltip
                                contentStyle={{
                                    background: "hsl(var(--card))",
                                    borderColor: "hsl(var(--border))",
                                }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={3} name="Total Followers" dot={false} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};


export default function AdminAnalyticsPage() {
    const { firestore } = useFirebase();
    const [allAccounts, setAllAccounts] = useState<SocialAccount[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const usersSnapshot = await getDocs(collection(firestore, 'users'));
                setTotalUsers(usersSnapshot.size);

                const accountsQuery = collectionGroup(firestore, 'socialAccounts');
                const accountsSnapshot = await getDocs(accountsQuery);
                const fetchedAccounts = accountsSnapshot.docs.map(doc => doc.data() as SocialAccount);
                setAllAccounts(fetchedAccounts);

            } catch (error) {
                console.error("Failed to fetch admin analytics:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [firestore]);

    const { instagramAccounts, facebookAccounts } = useMemo(() => {
        return {
            instagramAccounts: allAccounts.filter(a => a.platform === 'Instagram'),
            facebookAccounts: allAccounts.filter(a => a.platform === 'Facebook'),
        };
    }, [allAccounts]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Platform Analytics</h1>
                <p className="text-muted-foreground">
                  A high-level overview of platform performance across all users.
                </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                 <AdminStatsCard title="Total Users" value={totalUsers.toLocaleString()} icon={Users} />
                 <AdminStatsCard title="Total Connected Accounts" value={allAccounts.length.toLocaleString()} icon={BarChart} />
            </div>
            
            <Tabs defaultValue="instagram">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="instagram">Instagram</TabsTrigger>
                    <TabsTrigger value="facebook">Facebook</TabsTrigger>
                </TabsList>
                <TabsContent value="instagram" className="mt-6">
                   <PlatformAnalytics accounts={instagramAccounts} totalUsers={totalUsers} />
                </TabsContent>
                 <TabsContent value="facebook" className="mt-6">
                    <PlatformAnalytics accounts={facebookAccounts} totalUsers={totalUsers} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
