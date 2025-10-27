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
import { useState } from 'react';
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
  if (platform === 'Instagram') {
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
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
};

// This is a sample list of accounts that would be fetched from the social media API
const sampleAccounts = [
    { id: 'fb-page-1', displayName: 'My Awesome Facebook Page', platform: 'Facebook', avatar: `https://i.pravatar.cc/150?u=fb-page-1` },
    { id: 'ig-biz-1', displayName: 'My Cool Instagram Biz', platform: 'Instagram', avatar: `https://i.pravatar.cc/150?u=ig-biz-1` },
    { id: 'fb-page-2', displayName: 'Travel Blog Page', platform: 'Facebook', avatar: `https://i.pravatar.cc/150?u=fb-page-2` },
];


function AddAccountDialog({ apiCredentials }: { apiCredentials: ApiCredential[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<typeof sampleAccounts>([]);

  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  
  const handleSelectionChange = (account: typeof sampleAccounts[0], checked: boolean | 'indeterminate') => {
    setSelectedAccounts(prev => 
        checked ? [...prev, account] : prev.filter(a => a.id !== account.id)
    );
  };

  const handleConnectAccounts = async () => {
    if (!user || selectedAccounts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Accounts Selected',
        description: 'Please select at least one account to connect.',
      });
      return;
    }
    setIsLoading(true);

    const accountsCollection = collection(firestore, 'users', user.uid, 'socialAccounts');
    
    try {
        for (const account of selectedAccounts) {
            await addDocumentNonBlocking(accountsCollection, {
                userId: user.uid,
                platform: account.platform,
                displayName: account.displayName,
                accountId: account.id, // Use the real ID from the social platform
                avatar: account.avatar
            });
        }
        toast({
            title: 'Accounts Connected!',
            description: `${selectedAccounts.length} account(s) have been successfully connected.`,
        });
    } catch (error) {
        console.error("Error connecting accounts:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect accounts. Please try again.",
        });
    } finally {
        setIsLoading(false);
        setOpen(false);
        setSelectedAccounts([]);
    }
  };

  const hasNoCredentials = apiCredentials.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Facebook & Instagram</DialogTitle>
          <DialogDescription>
            {hasNoCredentials 
                ? 'Add your Meta API Keys first to connect accounts.' 
                : 'Select the accounts you want to connect to Social Streamliner.'}
          </DialogDescription>
        </DialogHeader>
        {hasNoCredentials ? (
           <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No API Keys Found</AlertTitle>
              <AlertDescription>
                You need to add API keys for Meta before you can connect an account. Please go to the API Keys tab to add your credentials.
              </AlertDescription>
            </Alert>
        ) : (
          <div className="py-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Available Accounts</p>
            <div className="space-y-3 rounded-md border p-4">
                {sampleAccounts.map(account => (
                    <div key={account.id} className="flex items-center space-x-3">
                        <Checkbox 
                            id={account.id} 
                            onCheckedChange={(checked) => handleSelectionChange(account, checked)}
                            checked={selectedAccounts.some(a => a.id === account.id)}
                        />
                        <Label htmlFor={account.id} className="flex items-center gap-3 font-normal cursor-pointer">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={account.avatar} />
                                <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p>{account.displayName}</p>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <PlatformIcon platform={account.platform as 'Facebook' | 'Instagram'} />
                                    <span className="text-xs">{account.platform}</span>
                                </div>
                            </div>
                        </Label>
                    </div>
                ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnectAccounts} disabled={isLoading || hasNoCredentials || selectedAccounts.length === 0}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Connecting...</> : `Connect ${selectedAccounts.length > 0 ? selectedAccounts.length : ''} Account(s)`}
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
    
    // Optimistic UI update can be implemented here if desired
    
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
        <AddAccountDialog apiCredentials={apiCredentials || []}/>
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
