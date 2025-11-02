
'use client';

import { StatsCards } from '@/components/analytics/stats-cards';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, getDocs } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { Loader2, RefreshCw, PlusSquare, ChevronLeft, ChevronRight } from 'lucide-react';
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
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowerChart } from '@/components/analytics/follower-chart';
import { EngagementChart } from '@/components/analytics/engagement-chart';
import { cn } from '@/lib/utils';


function AccountPerformance() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [mobileAccountIndex, setMobileAccountIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const socialAccountsQuery = useMemoFirebase(
    () => {
      if (!user) return null;
      return query(collection(firestore, 'users', user.uid, 'socialAccounts'), orderBy('followers', 'desc'));
    },
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

  const handleNextAccount = () => {
    if (accounts && mobileAccountIndex < accounts.length - 1) {
        setSlideDirection('left');
        setMobileAccountIndex(prev => prev + 1);
    }
  }

  const handlePrevAccount = () => {
      if (mobileAccountIndex > 0) {
          setSlideDirection('right');
          setMobileAccountIndex(prev => prev - 1);
      }
  }

  const currentMobileAccount = accounts ? accounts[mobileAccountIndex] : null;

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div>
            <CardTitle>Account Performance</CardTitle>
            <CardDescription>A detailed overview of all your connected accounts.</CardDescription>
        </div>
         <Button variant="outline" onClick={handleRefreshAllAnalytics} disabled={isRefreshingAll || isLoading} className="w-full sm:w-auto">
            {isRefreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="sm:hidden lg:inline ml-2">Refresh All</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        ) : accounts && accounts.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border overflow-x-auto">
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
                    {accounts.map((account, index) => (
                      <TableRow 
                        key={account.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={account.avatar} alt={account.displayName} />
                              <AvatarFallback>
                                {account.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium whitespace-nowrap">{account.displayName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500 whitespace-nowrap">
                            {account.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{(account.followers || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalLikes || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalComments || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.totalViews || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{(account.postCount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleRefreshAnalytics(account)} disabled={refreshingId === account.id || isRefreshingAll}>
                                    {refreshingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                    <span className="hidden lg:inline ml-2">Refresh</span>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/create-post?accountId=${account.id}`}>
                                        <PlusSquare className="h-4 w-4" />
                                        <span className="hidden lg:inline ml-2">Post</span>
                                    </Link>
                                </Button>
                            </div>
                        </TableCell>
                      </TableRow>
                    ))}
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

            {/* Mobile Card View */}
            <div className="md:hidden relative overflow-x-hidden h-64">
              {accounts.map((account, index) => (
                 <div
                    key={account.id}
                    className={cn("absolute w-full top-0 transition-transform duration-300 ease-in-out",
                        index === mobileAccountIndex ? "transform-none" :
                        index < mobileAccountIndex ? "-translate-x-full" : "translate-x-full"
                    )}
                 >
                   <div className="border rounded-lg p-4 space-y-4">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={account.avatar} alt={account.displayName} />
                            <AvatarFallback>
                              {account.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{account.displayName}</div>
                            <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500 whitespace-nowrap mt-1">
                              {account.platform}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="font-bold text-lg">{(account.followers || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Followers</p>
                            </div>
                             <div>
                                <p className="font-bold text-lg">{(account.totalLikes || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Likes</p>
                            </div>
                             <div>
                                <p className="font-bold text-lg">{(account.totalComments || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Comments</p>
                            </div>
                             <div>
                                <p className="font-bold text-lg">{(account.totalViews || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Views</p>
                            </div>
                             <div>
                                <p className="font-bold text-lg">{(account.postCount || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Posts</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => handleRefreshAnalytics(account)} disabled={refreshingId === account.id || isRefreshingAll} className="flex-1">
                                {refreshingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                <span className="ml-2">Refresh</span>
                            </Button>
                            <Button variant="outline" size="sm" asChild className="flex-1">
                                <Link href={`/create-post?accountId=${account.id}`}>
                                    <PlusSquare className="h-4 w-4" />
                                    <span className="ml-2">Post</span>
                                </Link>
                            </Button>
                        </div>
                    </div>
                 </div>
              ))}
              </div>
               <div className="flex items-center justify-between mt-4 md:hidden">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevAccount}
                    disabled={mobileAccountIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    {mobileAccountIndex + 1} / {accounts.length}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextAccount}
                    disabled={mobileAccountIndex === accounts.length - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
            
          </>
        ) : (
            <div className="text-center py-10">
                <p className="text-muted-foreground">No accounts connected yet.</p>
                <p className="text-sm text-muted-foreground">
                    Go to Settings to connect your first account.
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

const PlatformAnalytics = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => (
    <div className="space-y-6">
        <StatsCards platform={platform} />
        <div className="grid gap-6 md:grid-cols-2">
            <FollowerChart platform={platform} />
            <EngagementChart platform={platform} />
        </div>
        <AccountPerformance />
    </div>
);

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold font-headline">Analytics Overview</h1>
            <p className="text-muted-foreground">
            A summary of your performance across all connected social media accounts.
            </p>
        </div>

        <Tabs defaultValue="instagram">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="facebook">Facebook</TabsTrigger>
            </TabsList>
            <TabsContent value="instagram" className="mt-6">
                <PlatformAnalytics platform="Instagram" />
            </TabsContent>
            <TabsContent value="facebook" className="mt-6">
                <PlatformAnalytics platform="Facebook" />
            </TabsContent>
        </Tabs>
    </div>
  );
}
