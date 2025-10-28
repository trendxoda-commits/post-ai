

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Link as LinkIcon, Newspaper, CheckCircle2, Heart, MessageCircle, Eye } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalAccounts: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  apiStatus: string;
}

interface RecentUser {
  id: string;
  email: string;
  createdAt: string;
  connectedAccounts: string[];
}

export default function AdminDashboardPage() {
    const { firestore } = useFirebase();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;

        async function fetchData() {
            setIsLoading(true);
            try {
                // Fetch stats
                const usersSnapshot = await getDocs(collection(firestore, 'users'));
                const totalUsers = usersSnapshot.size;
                let totalAccounts = 0;
                for (const userDoc of usersSnapshot.docs) {
                    const socialAccountsSnapshot = await getDocs(collection(userDoc.ref, 'socialAccounts'));
                    totalAccounts += socialAccountsSnapshot.size;
                }

                // Fetch recent users
                // Note: Firestore client-side SDK doesn't support orderBy on a different field than a where clause without an index.
                // For this admin dashboard, we'll fetch all and sort client-side. A production app would have an index.
                const fetchedUsers: RecentUser[] = [];
                for (const doc of usersSnapshot.docs) {
                    const userData = doc.data();
                    const socialAccountsSnapshot = await getDocs(collection(doc.ref, 'socialAccounts'));
                    const connectedAccounts = socialAccountsSnapshot.docs.map(accDoc => accDoc.data().platform);

                    let createdAtDate = 'N/A';
                    if (userData.createdAt?.toDate) { // Check if it's a Firestore Timestamp
                        createdAtDate = userData.createdAt.toDate().toLocaleDateString();
                    } else if (userData.createdAt) {
                        try {
                           createdAtDate = new Date(userData.createdAt).toLocaleDateString();
                        } catch (e) { /* ignore invalid date */ }
                    }

                    fetchedUsers.push({
                        id: doc.id,
                        email: userData.email || 'N/A',
                        createdAt: createdAtDate,
                        connectedAccounts,
                    });
                }
                
                // Sort users by date client-side (assuming createdAt is a valid date string or timestamp)
                 fetchedUsers.sort((a, b) => {
                    try {
                        const dateA = new Date(a.createdAt).getTime();
                        const dateB = new Date(b.createdAt).getTime();
                        if (isNaN(dateA) || isNaN(dateB)) return 0;
                        return dateB - dateA;
                    } catch (e) {
                        return 0;
                    }
                });


                setStats({
                    totalUsers,
                    totalAccounts,
                    totalPosts: 150, // Placeholder
                    totalLikes: 12050, // Placeholder
                    totalComments: 2300, // Placeholder
                    apiStatus: "Healthy"
                });
                setRecentUsers(fetchedUsers.slice(0, 5));

            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
                setStats({
                    totalUsers: 0,
                    totalAccounts: 0,
                    totalPosts: 0,
                    totalLikes: 0,
                    totalComments: 0,
                    apiStatus: "Error"
                });
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [firestore]);

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
            
            {isLoading ? (
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <Card key={i}><CardHeader><div className="h-4 bg-muted rounded w-2/4" /></CardHeader><CardContent><div className="h-7 bg-muted rounded w-1/3 mb-2" /><div className="h-3 bg-muted rounded w-3/4" /></CardContent></Card>
                    ))}
                 </div>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">All registered users</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalAccounts.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Across all users</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalPosts.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">(Demo) Scheduled & published</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                            <Heart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalLikes.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">(Demo) Across all posts</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalComments.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">(Demo) Across all posts</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">API Status</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.apiStatus}</div>
                            <p className="text-xs text-muted-foreground">Meta Connection Health</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                 <p className="text-sm text-muted-foreground">Could not load dashboard stats.</p>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Recent Sign-ups</CardTitle>
                    <CardDescription>An overview of the most recently registered users.</CardDescription>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                     ) : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Connected Accounts</TableHead>
                                    <TableHead className="text-right">Sign-up Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentUsers.length > 0 ? recentUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="font-medium">{user.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {user.connectedAccounts.length > 0 ? (
                                                    user.connectedAccounts.map((platform, i) => (
                                                        <Badge key={i} variant={platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">{platform}</Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">{user.createdAt}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No users found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
