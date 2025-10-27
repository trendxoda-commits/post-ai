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
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
      viewBox="0 0 24"
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

function AddAccountDialog({ apiCredentials }: { apiCredentials: ApiCredential[] }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [platform, setPlatform] = useState<'Facebook' | 'Instagram' | ''>('');


  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  

  const handleConnectAccount = async () => {
    if (!user || !displayName || !platform) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a display name and select a platform.',
      });
      return;
    }
    setIsLoading(true);

    const accountsCollection = collection(firestore, 'users', user.uid, 'socialAccounts');
    
    try {
        await addDocumentNonBlocking(accountsCollection, {
            userId: user.uid,
            platform: platform,
            displayName: displayName,
            accountId: `${platform.toLowerCase()}-${Date.now()}`,
            avatar: `https://i.pravatar.cc/150?u=${displayName}`
        });
        toast({
            title: 'Account Connected!',
            description: `${displayName} has been successfully connected.`,
        });
    } catch (error) {
        console.error("Error connecting account:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not connect account. Please try again.",
        });
    } finally {
        setIsLoading(false);
        setOpen(false);
        setDisplayName('');
        setPlatform('');
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
          <DialogTitle>Connect Social Account</DialogTitle>
          <DialogDescription>
            {hasNoCredentials 
                ? 'Add your Meta API Keys first to connect accounts.' 
                : "Add your account's details manually. This simulates connecting a real account."}
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
            <div className="space-y-2">
                <Label htmlFor='account-name'>Display Name</Label>
                <Input id="account-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., My Awesome Page" />
            </div>
             <div className="space-y-2">
                <Label htmlFor='platform'>Platform</Label>
                <Select onValueChange={(value: 'Facebook' | 'Instagram') => setPlatform(value)} value={platform}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnectAccount} disabled={isLoading || hasNoCredentials || !displayName || !platform}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Connecting...</> : `Connect Account`}
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
