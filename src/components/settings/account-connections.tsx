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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import {
  useFirebase,
  useUser,
  useCollection,
  useMemoFirebase,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { SocialAccount, ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

const PlatformIcon = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => {
    // ... (icon implementation remains the same)
};

const sampleAccounts = [
    {
      id: 'fb-page-123',
      displayName: 'My Awesome Page',
      platform: 'Facebook',
      accountId: '100123456789'
    },
    {
      id: 'ig-profile-456',
      displayName: 'my_insta_handle',
      platform: 'Instagram',
      accountId: 'my_insta_handle'
    },
    {
      id: 'fb-page-456',
      displayName: 'Another Business Page',
      platform: 'Facebook',
      accountId: '100987654321'
    }
];


function AddAccountDialog({ apiCredentials, existingAccounts }: { apiCredentials: ApiCredential[], existingAccounts: SocialAccount[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<typeof sampleAccounts>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const hasNoCredentials = apiCredentials.length === 0;

  useEffect(() => {
    if (open && !hasNoCredentials) {
        // Simulate fetching accounts from Meta API
        setIsFetching(true);
        const alreadyConnectedIds = existingAccounts.map(a => a.accountId);
        setTimeout(() => {
            // Filter out accounts that are already connected
            const availableAccounts = sampleAccounts.filter(sa => !alreadyConnectedIds.includes(sa.accountId));
            setFetchedAccounts(availableAccounts);
            setIsFetching(false);
        }, 1500);
    } else {
        // Reset state on close
        setIsFetching(false);
        setFetchedAccounts([]);
        setSelectedAccountIds([]);
    }
  }, [open, hasNoCredentials, existingAccounts]);


  const handleConnectAccounts = async () => {
    if (!user || selectedAccountIds.length === 0) return;

    setIsLoading(true);
    const accountsToConnect = fetchedAccounts.filter(acc => selectedAccountIds.includes(acc.id));
    const accountsCollection = collection(firestore, 'users', user.uid, 'socialAccounts');

    try {
        const promises = accountsToConnect.map(account => {
            return addDocumentNonBlocking(accountsCollection, {
                userId: user.uid,
                platform: account.platform,
                displayName: account.displayName,
                accountId: account.accountId,
            });
        });

        await Promise.all(promises);

        toast({
            title: `${accountsToConnect.length} Account(s) Connected!`,
            description: `Successfully connected your accounts.`,
        });
    } catch (error) {
        console.error("Error connecting accounts:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect one or more accounts. Please try again.",
        });
    } finally {
        setIsLoading(false);
        setOpen(false);
    }
  };

  const toggleSelection = (accountId: string) => {
    setSelectedAccountIds(prev => 
        prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Facebook & Instagram</DialogTitle>
          <DialogDescription>
            {hasNoCredentials 
                ? 'Please add your Meta API Keys first to connect accounts.' 
                : "Select the pages and profiles you want to manage."}
          </DialogDescription>
        </DialogHeader>
        
        {hasNoCredentials ? (
           <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No API Keys Found</AlertTitle>
              <AlertDescription>
                Go to the API Keys tab to add your credentials before connecting accounts.
              </AlertDescription>
            </Alert>
        ) : isFetching ? (
            <div className="h-48 flex items-center justify-center flex-col gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Fetching accounts from Meta...</p>
            </div>
        ) : fetchedAccounts.length > 0 ? (
            <div className="py-4 space-y-3 max-h-64 overflow-y-auto">
                {fetchedAccounts.map(account => (
                     <div 
                        key={account.id} 
                        className="flex items-center gap-3 p-3 rounded-lg border has-[:checked]:bg-accent/10 has-[:checked]:border-accent"
                     >
                        <Checkbox 
                            id={account.id} 
                            onCheckedChange={() => toggleSelection(account.id)}
                            checked={selectedAccountIds.includes(account.id)}
                        />
                        <Label htmlFor={account.id} className="flex items-center gap-3 cursor-pointer w-full">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>{account.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold">{account.displayName}</p>
                                <p className="text-xs text-muted-foreground">{account.platform}</p>
                            </div>
                        </Label>
                    </div>
                ))}
            </div>
        ) : (
             <div className="h-48 flex items-center justify-center">
                 <p className="text-sm text-center text-muted-foreground">All available accounts are already connected.</p>
             </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnectAccounts} disabled={isLoading || isFetching || selectedAccountIds.length === 0 || hasNoCredentials}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Connecting...</> : `Connect (${selectedAccountIds.length}) Account(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    
    deleteDocumentNonBlocking(docRef).then(() => {
        toast({
            title: "Account Disconnected",
            description: "The account has been successfully disconnected."
        });
    }).catch((error) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not disconnect account."
        });
        console.error("Error disconnecting account: ", error);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected social media accounts.
          </CardDescription>
        </div>
        <AddAccountDialog apiCredentials={apiCredentials || []} existingAccounts={accounts || []} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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
                        {account.platform} ({account.accountId})
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
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No accounts connected yet.</p>
                <p className="text-sm text-muted-foreground">
                  Add API keys and then connect your first account.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
