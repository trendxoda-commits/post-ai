
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlusCircle, Trash2, Loader2, Info, RefreshCw } from 'lucide-react';
import {
  useFirebase,
  useUser,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuthUrl, getAccountAnalytics } from '@/app/actions';
import { useState } from 'react';

const PlatformIcon = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => {
  if (platform === 'Facebook') {
     return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
        </svg>
     )
  }
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
};

function AddAccountButton() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const apiCredentialsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null,
    [firestore, user]
  );
  const { data: apiCredentials, isLoading: isLoadingCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);

  const hasCredentials = apiCredentials && apiCredentials.length > 0;
  const appId = hasCredentials ? apiCredentials[0].appId : undefined;
  
  const handleConnect = async () => {
    if (!user || !appId) {
      toast({
        variant: 'destructive',
        title: 'API Keys Not Found',
        description: 'Please add your Meta App API Keys in the "API Keys" tab first.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { url } = await getAuthUrl({ clientId: appId, userId: user.uid });
      // Redirect the user to the Facebook auth URL
      window.location.href = url;
    } catch (error: any) {
      console.error('Failed to get auth URL', error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error.message || 'Could not start the connection process. Please try again.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={isLoading || isLoadingCredentials || !hasCredentials}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <PlusCircle className="mr-2 h-4 w-4" />
      )}
      Add Account
    </Button>
  );
}

export function AccountConnections() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const socialAccountsQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<SocialAccount>(socialAccountsQuery);

  const apiCredentialsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null,
    [firestore, user]
  );
  const { data: apiCredentials, isLoading: isLoadingCredentials } = useCollection<ApiCredential>(apiCredentialsQuery);

  const isLoading = isLoadingAccounts || isLoadingCredentials;

  const handleDisconnect = (accountId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'socialAccounts', accountId);
    
    // Use the non-blocking delete function
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Account Disconnected",
        description: "The account has been successfully disconnected."
    });
  };

  const handleRefreshAnalytics = async (account: SocialAccount) => {
    if (!user || !apiCredentials || apiCredentials.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot refresh without API credentials.' });
      return;
    }
    const userAccessToken = apiCredentials[0].accessToken;
    if (!userAccessToken || !account.pageAccessToken) {
        toast({ variant: 'destructive', title: 'Error', description: 'A required access token is missing. Please reconnect your account.' });
        return;
    }

    setRefreshingId(account.id);
    try {
        const newAnalytics = await getAccountAnalytics({
            accountId: account.accountId,
            platform: account.platform,
            pageAccessToken: account.pageAccessToken, // CRITICAL FIX: Pass the correct pageAccessToken
            userAccessToken: userAccessToken,
        });

        const accountDocRef = doc(firestore, 'users', user.uid, 'socialAccounts', account.id);
        
        await setDocumentNonBlocking(accountDocRef, newAnalytics, { merge: true });

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


  return (
    <Card>
      <CardHeader className="flex flex-row items-start sm:items-center justify-between">
        <div>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage and refresh your connected Facebook and Instagram accounts.
          </CardDescription>
        </div>
        <AddAccountButton />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
             {(!apiCredentials || apiCredentials.length === 0) && (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Set Up API Keys</AlertTitle>
                    <AlertDescription>
                        To connect your social accounts, first add your Meta App credentials in the "API Keys" tab.
                    </AlertDescription>
                </Alert>
            )}
            {accounts && accounts.length > 0 ? (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={account.avatar} alt={account.displayName} />
                      <AvatarFallback>
                        {account.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{account.displayName}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleRefreshAnalytics(account)} disabled={refreshingId === account.id}>
                        {refreshingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="hidden sm:inline ml-2">Refresh</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(account.id)} disabled={!!refreshingId}>
                      <Trash2 className="h-4 w-4 mr-2 sm:hidden" />
                      <span className="hidden sm:inline">Disconnect</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : apiCredentials && apiCredentials.length > 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No accounts connected yet.</p>
                <p className="text-sm text-muted-foreground">
                  Click "Add Account" to connect your first account.
                </p>
              </div>
            ) : null }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
