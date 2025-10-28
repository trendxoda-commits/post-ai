
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { SocialAccount } from '@/lib/types';
import { StatsCards } from '@/components/analytics/stats-cards';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemo } from 'react';


function AccountFollowers() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialAccounts'), orderBy('followers', 'desc')) : null,
    [firestore, user]
  );
  // Use the real-time hook
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);

  const sortedAccounts = useMemo(() => {
    // The data from useCollection is already an array, just ensure it's sorted if needed.
    // The query now handles sorting by followers descending.
    return accounts;
  }, [accounts]);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Followers</CardTitle>
        <CardDescription>Follower count for each of your connected accounts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        ) : sortedAccounts && sortedAccounts.length > 0 ? (
          sortedAccounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={account.avatar} alt={account.displayName} />
                  <AvatarFallback>
                    {account.displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{account.displayName}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {(account.followers || 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
            </div>
          ))
        ) : (
            <p className="text-sm text-center text-muted-foreground py-4">No accounts connected or data available.</p>
        )}
      </CardContent>
    </Card>
  );
}


export default function DashboardPage() {
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <Button asChild>
            <Link href="/create-post">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
        <StatsCards />
        <AccountFollowers />
    </div>
  );
}
