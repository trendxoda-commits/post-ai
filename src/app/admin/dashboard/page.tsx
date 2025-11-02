

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Users, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, collectionGroup } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


interface DashboardStats {
  totalUsers: number;
  totalAccounts: number;
  apiStatus: string;
}

interface RecentUser {
  id: string;
  email: string | undefined;
  createdAt: string;
  connectedAccounts: number;
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
                // Fetch stats using collectionGroup for efficiency
                const usersSnapshot = await getDocs(collection(firestore, 'users'));
                const accountsSnapshot = await getDocs(collectionGroup(firestore, 'socialAccounts'));
                
                const totalUsers = usersSnapshot.size;
                const totalAccounts = accountsSnapshot.size;
                
                 setStats({
                    totalUsers,
                    totalAccounts,
                    apiStatus: "Healthy"
                });

                // Fetch recent users
                const fetchedUsers: RecentUser[] = [];
                for (const doc of usersSnapshot.docs) {
                    const userData = doc.data() as User;
                    const socialAccountsSnapshot = await getDocs(collection(doc.ref, 'socialAccounts'));
                    const connectedAccountsCount = socialAccountsSnapshot.size;

                    let createdAtDate = 'N/A';
                     if (userData.createdAt) {
                        try {
                           createdAtDate = new Date(userData.createdAt).toLocaleDateString();
                        } catch (e) { /* ignore invalid date */ }
                    }

                    fetchedUsers.push({
                        id: doc.id,
                        email: userData.email,
                        createdAt: createdAtDate,
                        connectedAccounts: connectedAccountsCount,
                    });
                }
                
                // Sort users by date client-side
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

                setRecentUsers(fetchedUsers.slice(0, 5));

            } catch (error) {
                console.error("Error fetching admin dashboard data:", error);
                setStats({
                    totalUsers: 0,
                    totalAccounts: 0,
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
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <Skeleton className="h-4 w-2/4" />
                            </CardHeader>
                            <CardContent>
                               <Skeleton className="h-7 w-1/3 mb-2" />
                               <Skeleton className="h-3 w-3/4" />
                            </CardContent>
                        </Card>
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
                        <div className="overflow-x-auto">
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
                                                <div className="font-medium">{user.email || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary">{user.connectedAccounts}</Badge>
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
                        </div>
                     )}
                </CardContent>
            </Card>
        </div>
    );
}
