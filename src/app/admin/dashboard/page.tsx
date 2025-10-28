'use server';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, Users, Link as LinkIcon, Postcard, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';

// Server-side Firebase initialization
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  adminApp = getApps()[0];
}
const firestore = getFirestore(adminApp);


async function getAdminDashboardStats() {
    const usersSnapshot = await firestore.collection('users').get();
    const totalUsers = usersSnapshot.size;

    let totalAccounts = 0;
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

    for (const user of allUsers) {
        const socialAccountsSnapshot = await firestore.collection(`users/${user.id}/socialAccounts`).get();
        totalAccounts += socialAccountsSnapshot.size;
    }

    return {
        totalUsers,
        totalAccounts,
        totalPosts: 150, // Placeholder
        apiStatus: "Healthy" // Placeholder
    };
}


async function getRecentUsers() {
    const usersSnapshot = await firestore.collection('users').orderBy('createdAt', 'desc').limit(5).get();
    
    const users = await Promise.all(usersSnapshot.docs.map(async (doc) => {
        const userData = doc.data();
        const socialAccountsSnapshot = await firestore.collection(`users/${doc.id}/socialAccounts`).get();
        const connectedAccounts = socialAccountsSnapshot.docs.map(accDoc => accDoc.data().platform);

        return {
            id: doc.id,
            email: userData.email || 'N/A',
            createdAt: new Date(userData.createdAt).toLocaleDateString(),
            connectedAccounts,
        };
    }));

    return users;
}


export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats();
    const recentUsers = await getRecentUsers();

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">All registered users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                        <p className="text-xs text-muted-foreground">Across all users</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                        <Postcard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.totalPosts}</div>
                        <p className="text-xs text-muted-foreground">(Demo) Posts scheduled & published</p>
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

            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>An overview of the most recently signed-up users.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    );
}
