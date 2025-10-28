
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { SearchComponent } from './search-component';
import { useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, collectionGroup, query, getDocs, doc, setDoc, where } from 'firebase/firestore';
import type { SocialAccount, User, ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getAccountAnalytics } from '@/app/actions';


// This interface will hold the merged account and user data
interface FullAccountDetails extends SocialAccount {
  user: {
    id: string;
    email?: string;
  };
}


export default function AdminAccountsPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FullAccountDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  // We will fetch all users first, then listen to their social accounts.
  // This is a more scalable approach for admin panels.
  useEffect(() => {
    if (!firestore) return;

    const fetchAllAccounts = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch all users to create a map of userId -> email
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userMap = new Map<string, string | undefined>();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as User;
            userMap.set(doc.id, userData.email);
        });

        // 2. Use a collectionGroup query to get all 'socialAccounts' across all users
        const accountsQuery = collectionGroup(firestore, 'socialAccounts');
        const accountsSnapshot = await getDocs(accountsQuery);
        
        const fetchedAccounts: FullAccountDetails[] = accountsSnapshot.docs.map(accountDoc => {
          const accountData = accountDoc.data() as SocialAccount;
          const userId = accountDoc.ref.parent.parent!.id; // Get parent user ID

          return {
            ...accountData,
            id: accountDoc.id, // The document ID of the socialAccount
            user: {
              id: userId,
              email: userMap.get(userId),
            },
          };
        });
        
        setAccounts(fetchedAccounts);

      } catch (error) {
        console.error("Failed to fetch admin accounts:", error);
        setAccounts([]); // Set to empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllAccounts();

    // Note: A real-time listener for a collectionGroup can be expensive on reads.
    // For an admin panel, fetching once on load or periodically is often a better pattern.
    // If real-time is a strict requirement, onSnapshot can be used here, but be mindful of the cost.

  }, [firestore]);


  const searchQuery = searchParams.get('query')?.toLowerCase() || '';

  const filteredAccounts = useMemo(() => {
    if (!searchQuery) {
      return accounts;
    }
    return accounts.filter(
      (account) =>
        account.displayName.toLowerCase().includes(searchQuery) ||
        (account.user.email && account.user.email.toLowerCase().includes(searchQuery))
    );
  }, [accounts, searchQuery]);


   const handleRefreshAnalytics = async (account: FullAccountDetails) => {
    if (!firestore) return;
    
    // Find the user access token for the user who owns this account
    const credsRef = collection(firestore, 'users', account.user.id, 'apiCredentials');
    const credsQuery = query(credsRef, where('platform', '==', 'Meta'));
    const credsSnapshot = await getDocs(credsQuery);
    
    if (credsSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Error', description: `API credentials not found for user ${account.user.email}.` });
        return;
    }
    
    const apiCredential = credsSnapshot.docs[0].data() as ApiCredential;
    const userAccessToken = apiCredential.accessToken;

    if (!userAccessToken) {
        toast({ variant: 'destructive', title: 'Error', description: `User access token not found for user ${account.user.email}. They may need to reconnect.` });
        return;
    }

    setRefreshingId(account.id);
    try {
        const newAnalytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: account.pageAccessToken!,
            userAccessToken: userAccessToken,
        });

        const accountDocRef = doc(firestore, 'users', account.user.id, 'socialAccounts', account.id);
        
        await setDoc(accountDocRef, newAnalytics, { merge: true });

        // Update local state to reflect the change immediately
        setAccounts(prevAccounts => 
            prevAccounts.map(acc => 
                acc.id === account.id ? { ...acc, ...newAnalytics } : acc
            )
        );

        toast({
            title: 'Refresh Successful',
            description: `Analytics for ${account.displayName} have been updated.`,
        });

    } catch (error: any) {
        console.error('Failed to refresh analytics from admin:', error);
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
    if (!firestore) return;
    setIsRefreshingAll(true);
    toast({
        title: 'Starting Global Refresh',
        description: 'This may take a few minutes. Data will update in the table as it comes in.',
    });

    try {
        // Create a map of userId -> userAccessToken for efficiency
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userTokenMap = new Map<string, string>();
        for (const userDoc of usersSnapshot.docs) {
            const credsRef = collection(firestore, 'users', userDoc.id, 'apiCredentials');
            const credsQuery = query(credsRef, where('platform', '==', 'Meta'));
            const credsSnapshot = await getDocs(credsQuery);
            if (!credsSnapshot.empty) {
                const apiCredential = credsSnapshot.docs[0].data() as ApiCredential;
                if (apiCredential.accessToken) {
                    userTokenMap.set(userDoc.id, apiCredential.accessToken);
                }
            }
        }
        
        let successCount = 0;
        let failCount = 0;

        // Sequentially process each account to avoid overwhelming APIs
        for (const account of accounts) {
            const userAccessToken = userTokenMap.get(account.user.id);
            if (!userAccessToken || !account.pageAccessToken) {
                console.warn(`Skipping refresh for ${account.displayName} due to missing tokens.`);
                failCount++;
                continue;
            }

            try {
                const newAnalytics = await getAccountAnalytics({
                    accountId: account.accountId,
                    platform: account.platform,
                    pageAccessToken: account.pageAccessToken,
                    userAccessToken,
                });
                
                const accountDocRef = doc(firestore, 'users', account.user.id, 'socialAccounts', account.id);
                await setDoc(accountDocRef, newAnalytics, { merge: true });

                // Update local state
                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, ...newAnalytics } : a));
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

    } catch (error: any) {
        console.error('An error occurred during global refresh:', error);
        toast({
            variant: 'destructive',
            title: 'Global Refresh Failed',
            description: 'A critical error occurred. Check the console for details.',
        });
    } finally {
        setIsRefreshingAll(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">All Connected Accounts</h1>
        <p className="text-muted-foreground">
          A list of all social media accounts connected by users across the application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>A complete list of all connected accounts from all users.</CardDescription>
            </div>
            <div className="flex gap-2">
                <SearchComponent />
                <Button variant="outline" onClick={handleRefreshAllAnalytics} disabled={isRefreshingAll || isLoading}>
                    {isRefreshingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-2">Refresh All</span>
                </Button>
            </div>
          </div>
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
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Posts</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts && filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="font-medium">{account.displayName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">
                            {account.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{account.user.email || 'N/A'}</div>
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
                      <TableCell colSpan={9} className="h-24 text-center">
                        {searchQuery ? `No accounts found for "${searchQuery}".` : "No accounts have been connected yet."}
                      </TableCell>
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
