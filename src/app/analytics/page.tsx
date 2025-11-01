
'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getAccountAnalytics } from '@/app/actions';
import { Button } from '@/components/ui/button';


function AccountPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const socialAccountsQuery = useMemoFirebase(
    () => user ? query(collection(firestore, 'users', user.uid, 'socialAccounts'), orderBy('followers', 'desc')) : null,
    [firestore, user]
  );
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);

  const totals = useMemo(() => {
    if (!accounts) {
        return { followers: 0, totalLikes: 0, totalComments: 0, totalViews: 0, postCount: 0 };
    }
    return accounts.reduce((acc, account) => {
        acc.followers += account.followers || 0;
        acc.totalLikes += account.totalLikes || 0;
        acc.totalComments += account.totalComments || 0;
        acc.totalViews += account.totalViews || 0;
        acc.postCount += account.postCount || 0;
        return acc;
    }, { followers: 0, totalLikes: 0, totalComments: 0, totalViews: 0, postCount: 0 });
  }, [accounts]);

  const handleRefreshAnalytics = async (account: SocialAccount) => {
    if (!user || !firestore) return;
    
    const credsRef = collection(firestore, 'users', user.uid, 'apiCredentials');
    const credsSnapshot = await getDocs(credsRef);
    
    if (credsSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Error', description: `API credentials not found. Please add them in Settings.` });
        return;
    }
    
    const apiCredential = credsSnapshot.docs[0].data() as ApiCredential;
    const userAccessToken = apiCredential.accessToken;

    if (!userAccessToken || !account.pageAccessToken) {
        toast({ variant: 'destructive', title: 'Error', description: `A required access token is missing. Please try reconnecting your account in Settings.` });
        return;
    }

    setRefreshingId(account.id);
    try {
        const newAnalytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: account.pageAccessToken,
            userAccessToken: userAccessToken,
        });

        const accountDocRef = doc(firestore, 'users', user.uid, 'socialAccounts', account.id);
        
        // Non-blocking write - UI will update automatically via useCollection hook
        setDocumentNonBlocking(accountDocRef, newAnalytics, { merge: true });

        toast({
            title: 'Refresh Successful',
            description: `Analytics for ${account.displayName} have been updated.`,
        });

    } catch (error: any) {
        console.error('Failed to refresh analytics:', error);
        toast({
            variant: 'destructive',
            title: 'Refresh Failed',
            description: error.message || 'Could not update account analytics.',
        });
    } finally {
        setRefreshingId(null);
    }
  };
  
   const handleRefreshAllAnalytics = async () => {
    if (!user || !firestore || !accounts) return;
    
    setIsRefreshingAll(true);
    toast({
      title: 'Starting Global Refresh',
      description: 'Fetching the latest data for all your accounts.',
    });
    
    const credsRef = collection(firestore, 'users', user.uid, 'apiCredentials');
    const credsSnapshot = await getDocs(credsRef);
    
    if (credsSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Error', description: `API credentials not found.` });
        setIsRefreshingAll(false);
        return;
    }
    
    const userAccessToken = (credsSnapshot.docs[0].data() as ApiCredential).accessToken;
    if (!userAccessToken) {
        toast({ variant: 'destructive', title: 'Error', description: `Your main access token is missing. Please reconnect.` });
        setIsRefreshingAll(false);
        return;
    }
    
    let successCount = 0;
    let failCount = 0;

    for (const account of accounts) {
      if (!account.pageAccessToken) {
        failCount++;
        continue;
      }
      try {
        const newAnalytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: account.pageAccessToken,
            userAccessToken: userAccessToken,
        });
        const accountDocRef = doc(firestore, 'users', user.uid, 'socialAccounts', account.id);
        setDocumentNonBlocking(accountDocRef, newAnalytics, { merge: true });
        successCount++;
      } catch (error) {
        console.error(`Failed to refresh account ${account.displayName}:`, error);
        failCount++;
      }
    }
    
    toast({
      title: 'Global Refresh Complete',
      description: `Successfully refreshed ${successCount} accounts. ${failCount} failed.`,
    });
    setIsRefreshingAll(false);
  };


  return (
    <Card>
      <CardHeader className="flex flex-row items-start sm:items-center justify-between">
         <div>
            <CardTitle>Account Performance</CardTitle>
            <CardDescription>A complete overview of your connected accounts.</CardDescription>
        </div>
         <Button variant="outline" onClick={handleRefreshAllAnalytics} disabled={isRefreshingAll || isLoading}>
            {isRefreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="hidden sm:inline ml-2">Refresh All</span>
        </Button>
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
                    <TableHead className="text-center">Actions</TableHead>
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
                        <TableCell className="text-center">
                            <Button variant="outline" size="sm" onClick={() => handleRefreshAnalytics(account)} disabled={refreshingId === account.id || isRefreshingAll}>
                                {refreshingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                <span className="hidden sm:inline ml-2">Refresh</span>
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No accounts have been connected yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                 <TableFooter>
                    <TableRow>
                        <TableCell colSpan={2} className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">{(totals.followers).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{(totals.totalLikes).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{(totals.totalComments).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{(totals.totalViews).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{(totals.postCount).toLocaleString()}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableFooter>
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
    </div>
  );
}
