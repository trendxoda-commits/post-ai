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
import { PlusCircle, Trash2, Loader2, Info } from 'lucide-react';
import {
  useFirebase,
  useUser,
  useCollection,
  useMemoFirebase,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAuthUrl } from '@/app/actions';
import { useState } from 'react';

const PlatformIcon = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => {
  const Icon = platform === 'Instagram'
    ? (
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
      )
    : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      );
  return Icon;
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start sm:items-center justify-between">
        <div>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected Facebook and Instagram accounts.
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
                    <div className="text-muted-foreground">
                        <PlatformIcon platform={account.platform} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleDisconnect(account.id)}>
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
