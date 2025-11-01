
'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PostPerformance } from '@/components/analytics/post-performance';


function AccountPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialAccounts'), orderBy('followers', 'desc')) : null,
    [firestore, user]
  );
  // Use the real-time hook
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Performance</CardTitle>
        <CardDescription>A complete overview of your connected accounts.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts && accounts.length > 0 ? (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={account.avatar} alt={account.displayName} />
                              <AvatarFallback>
                                {account.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{account.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">
                            {account.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{(account.followers || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalLikes || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalComments || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalViews || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.postCount || 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No accounts have been connected yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold font-headline">Analytics Overview</h1>
      <StatsCards />
      <AccountPerformance />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <FollowerChart />
          <EngagementChart />
      </div>
       <PostPerformance />
    </div>
  );
}
