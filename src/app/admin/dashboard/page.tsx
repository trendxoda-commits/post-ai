
'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Link2, Send, Activity, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from 'next/link';


// Mock data for the dashboard
const mockUsers = [
  {
    id: 'user-1',
    name: 'Harish Kumar',
    email: 'harish.k@example.com',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2 hours ago',
    avatar: 'https://picsum.photos/seed/1/40/40',
    totalFollowers: 12500,
    totalViews: 250000,
    accounts: [
      { id: 'acc-1-1', name: 'Harish\'s Insta', platform: 'Instagram' },
      { id: 'acc-1-2', name: 'Harish\'s Facebook', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-2',
    name: 'Sunita Sharma',
    email: 'sunita.s@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '1 day ago',
    avatar: 'https://picsum.photos/seed/2/40/40',
    totalFollowers: 7800,
    totalViews: 120000,
     accounts: [
      { id: 'acc-2-1', name: 'Sunita\'s Travel Blog', platform: 'Instagram' },
    ]
  },
  {
    id: 'user-3',
    name: 'Raj Patel',
    email: 'raj.p@example.com',
    role: 'Viewer',
    status: 'Pending',
    lastLogin: '3 days ago',
    avatar: 'https://picsum.photos/seed/3/40/40',
    totalFollowers: 1200,
    totalViews: 15000,
     accounts: [
      { id: 'acc-3-1', name: 'Raj\'s Food Page', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-4',
    name: 'Anjali Verma',
    email: 'anjali.v@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '5 hours ago',
    avatar: 'https://picsum.photos/seed/4/40/40',
    totalFollowers: 25000,
    totalViews: 1200000,
    accounts: [
      { id: 'acc-4-1', name: 'Anjali\'s Art', platform: 'Instagram' },
      { id: 'acc-4-2', name: 'Anjali\'s Design Co.', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-5',
    name: 'Vikram Singh',
    email: 'vikram.s@example.com',
    role: 'Viewer',
    status: 'Inactive',
    lastLogin: '1 week ago',
    avatar: 'https://picsum.photos/seed/5/40/40',
    totalFollowers: 0,
    totalViews: 0,
    accounts: []
  }
];

// Exporting mock data to be used in other admin pages
export { mockUsers };

function RecentPosts() {
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => {
    // Generate dynamic data on client to avoid hydration mismatch
    const posts = mockUsers
      .filter(u => u.accounts.length > 0)
      .slice(0, 3)
      .map(user => ({
        id: user.id,
        avatar: user.avatar,
        name: user.name,
        accountName: user.accounts[0].name,
        likes: Math.floor(Math.random() * 200 + 50),
      }));
    setRecentPosts(posts);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Posts</CardTitle>
        <CardDescription>A look at the latest content published by users.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
        {recentPosts.length > 0 ? recentPosts.map(post => (
          <div className="flex items-center gap-4" key={post.id}>
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={post.avatar} alt="Avatar" />
              <AvatarFallback>{post.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">{post.name}</p>
              <p className="text-sm text-muted-foreground">
                Published a post to {post.accountName}
              </p>
            </div>
            <div className="ml-auto font-medium text-sm">+{post.likes}</div>
          </div>
        )) : Array.from({ length: 3 }).map((_, i) => (
            <div className="flex items-center gap-4" key={i}>
                <Avatar className="hidden h-9 w-9 sm:flex">
                    <AvatarFallback>...</AvatarFallback>
                </Avatar>
                 <div className="grid gap-1 w-full">
                    <p className="text-sm font-medium leading-none">Loading...</p>
                    <p className="text-sm text-muted-foreground">Fetching recent posts...</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}


export default function AdminDashboardPage() {

  const totalUsers = mockUsers.length;
  const totalAccounts = mockUsers.reduce((sum, user) => sum + user.accounts.length, 0);
  const totalPosts = 142; // mock number

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">+2 since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">+5 since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalPosts}</div>
            <p className="text-xs text-muted-foreground">+23 since last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Users</CardTitle>
              <CardDescription>
                An overview of all registered users on the platform.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/admin/accounts">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden xl:table-cell">Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Role</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.slice(0, 5).map(user => (
                   <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="hidden h-9 w-9 sm:flex">
                                <AvatarImage src={user.avatar} alt="Avatar" />
                                <AvatarFallback>{user.name.slice(0,2)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                         <Badge 
                            variant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'}
                            className={user.status === 'Active' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : user.status === 'Pending' ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30' : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'}
                          >
                            {user.status}
                          </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                          {user.role}
                      </TableCell>
                      <TableCell className="text-right">{user.accounts.length}</TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <RecentPosts />
      </div>
    </>
  );
}
