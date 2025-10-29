
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
import { PlusCircle, Trash2, Loader2, Info, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
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
import { getAuthUrl, getAccountAnalytics, validateToken } from '@/app/actions';
import { useState, useEffect } from 'react';

function ReconnectButton({ isHeaderButton = false, fullWidth = false }: { isHeaderButton?: boolean, fullWidth?: boolean }) {
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
  
  if (isHeaderButton) {
      return (
        <Button onClick={handleConnect} disabled={isLoading || isLoadingCredentials || !hasCredentials}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
             Add Account
        </Button>
      )
  }

  return (
     <Button variant="secondary" size="sm" onClick={handleConnect} disabled={isLoading || isLoadingCredentials || !hasCredentials} className={fullWidth ? "w-full" : ""}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
        Reconnect Now
    </Button>
  );
}

export function AccountConnections() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isTokenLoading, setIsTokenLoading] = useState(true);


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

  const isLoading = isLoadingAccounts || isLoadingCredentials || isTokenLoading;
  const hasApiKeys = apiCredentials && apiCredentials.length > 0;
  const userAccessToken = hasApiKeys ? apiCredentials[0].accessToken : undefined;


  useEffect(() => {
    const checkToken = async () => {
        if (userAccessToken) {
            setIsTokenLoading(true);
            const { isValid } = await validateToken({ accessToken: userAccessToken });
            setIsTokenValid(isValid);
            setIsTokenLoading(false);
        } else {
            // If there's no token, we don't need to validate it.
            setIsTokenValid(true);
            setIsTokenLoading(false);
        }
    };
    // Only run check if we are not loading credentials anymore
    if (!isLoadingCredentials) {
        checkToken();
    }
  }, [userAccessToken, isLoadingCredentials]);


  const handleDisconnect = (accountId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'socialAccounts', accountId);
    
    deleteDocumentNonBlocking(docRef);

    toast({
        title: "Account Disconnected",
        description: "The account has been successfully disconnected."
    });
  };

  const handleRefreshAnalytics = async (account: SocialAccount) => {
    if (!user || !userAccessToken || !account.pageAccessToken) {
        toast({ variant: 'destructive', title: 'Error', description: 'A required access token is missing. Please use "Reconnect" to refresh your main authentication.' });
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
        <ReconnectButton isHeaderButton={true} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
             {!hasApiKeys && (
                 <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Set Up API Keys</AlertTitle>
                    <AlertDescription>
                        To connect your social accounts, first add your Meta App credentials in the "API Keys" tab.
                    </AlertDescription>
                </Alert>
            )}
             {hasApiKeys && !isTokenValid && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Expired</AlertTitle>
                    <AlertDescription>
                       Your connection to Meta has expired. Please reconnect to continue syncing data and posting content.
                       <div className="mt-4">
                        <ReconnectButton fullWidth={true}/>
                       </div>
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
                    <Button variant="outline" size="sm" onClick={() => handleRefreshAnalytics(account)} disabled={refreshingId === account.id || !isTokenValid}>
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
            ) : hasApiKeys ? (
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

    