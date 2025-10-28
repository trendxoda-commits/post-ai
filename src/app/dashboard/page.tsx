'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useState, useEffect } from 'react';
import { getAccountAnalytics } from '@/app/actions';
import { StatsCards } from '@/components/analytics/stats-cards';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


function AccountFollowers() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [accountsData, setAccountsData] = useState<{name: string, followers: number, avatar?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const apiCredentialsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null
  , [firestore, user]);
  const { data: apiCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);
  const userAccessToken = apiCredentials?.[0]?.accessToken;


  useEffect(() => {
    const fetchAccountFollowers = async () => {
      if (!accounts || !userAccessToken) {
        setIsLoading(false);
        return;
      };

      setIsLoading(true);
      
      const followersPromises = accounts.map(async (account) => {
        try {
          const pageAccessToken = account.pageAccessToken!;
          
          if (!pageAccessToken) {
            console.warn(`No access token available for ${account.displayName}. Skipping.`);
            return null;
          }

          const analytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: pageAccessToken,
            userAccessToken: userAccessToken,
          });

          return {
            name: account.displayName,
            followers: analytics.followers,
            avatar: account.avatar,
          };
        } catch (error) {
          console.error(`Failed to fetch followers for ${account.displayName}`, error);
          return {
            name: account.displayName,
            followers: 0,
            avatar: account.avatar,
          };
        }
      });
      
      const allFollowers = (await Promise.all(followersPromises))
        .filter((stat): stat is {name: string, followers: number, avatar?: string} => stat !== null)
        .sort((a, b) => b.followers - a.followers);

      setAccountsData(allFollowers);
      setIsLoading(false);
    };

    if (accounts && userAccessToken) {
      fetchAccountFollowers();
    } else if (accounts === null && user) {
      // Still loading accounts, do nothing
    } else {
      // No accounts or no token
      setIsLoading(false);
    }
  }, [accounts, userAccessToken, user]);


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
        ) : accountsData.length > 0 ? (
          accountsData.map((account) => (
            <div key={account.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={account.avatar} alt={account.name} />
                  <AvatarFallback>
                    {account.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{account.name}</p>
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
