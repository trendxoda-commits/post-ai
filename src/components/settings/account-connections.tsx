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
import { PlusCircle, Trash2, Loader2, Info, Check, ChevronsUpDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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

// Simulated accounts that would be fetched from the Meta API
const simulatedAccounts = [
    { id: '101', displayName: 'My Travel Blog', platform: 'Facebook' as const, type: 'Page' },
    { id: '102', displayName: 'The Foodie Channel', platform: 'Facebook' as const, type: 'Page' },
    { id: '201', displayName: '@urban_explorer', platform: 'Instagram' as const, type: 'Profile' },
    { id: '202', displayName: '@nature_lover', platform: 'Instagram' as const, type: 'Profile' },
];


function AddAccountDialog({ apiCredentials, existingAccounts }: { apiCredentials: ApiCredential[], existingAccounts: SocialAccount[] }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Initial, 2: Loading, 3: Select, 4: Saving
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const hasNoCredentials = apiCredentials.length === 0;

  const resetDialog = () => {
    setStep(1);
    setSelectedAccountIds([]);
  }

  const handleFetchAccounts = () => {
    setStep(2); // Show loading spinner
    // Simulate API call to Meta
    setTimeout(() => {
      setStep(3); // Show selection list
    }, 1500);
  };

  const handleConnectAccounts = async () => {
    if (!user || selectedAccountIds.length === 0) return;
    
    setStep(4); // Show saving spinner

    const accountsToConnect = simulatedAccounts.filter(acc => selectedAccountIds.includes(acc.id));
    const accountsCollection = collection(firestore, 'users', user.uid, 'socialAccounts');

    const promises = accountsToConnect.map(acc => {
      return addDocumentNonBlocking(accountsCollection, {
          userId: user.uid,
          platform: acc.platform,
          displayName: acc.displayName,
          accountId: acc.id,
          avatar: `https://picsum.photos/seed/${acc.id}/40/40`
      });
    });

    try {
        await Promise.all(promises);
        toast({
          title: "Accounts Added!",
          description: `Successfully connected ${accountsToConnect.length} new account(s).`,
        });
    } catch (e) {
        console.error("Error connecting accounts", e);
        toast({
            variant: "destructive",
            title: "Error",
            description: "There was an issue connecting your accounts.",
        });
    } finally {
        setOpen(false);
        resetDialog();
    }
  };

  const isAlreadyConnected = (simulatedAccountId: string) => {
    return existingAccounts.some(acc => acc.accountId === simulatedAccountId);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Social Accounts</DialogTitle>
          <DialogDescription>
            {step === 1 && "Connect new Facebook Pages or Instagram Profiles."}
            {step === 3 && "Select the accounts you want to manage with Social Streamliner."}
            {(step === 2 || step === 4) && "Please wait..."}
          </DialogDescription>
        </DialogHeader>
        
        {hasNoCredentials ? (
           <div className="py-4">
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No API Keys Found</AlertTitle>
                <AlertDescription>
                    Go to the API Keys tab to add your Meta App credentials before connecting accounts.
                </AlertDescription>
            </Alert>
           </div>
        ) : (
            <div className="py-4 min-h-[200px] flex flex-col justify-center">
                {step === 1 && (
                    <div className="text-center space-y-4">
                        <p>You will be redirected to Facebook to authorize Social Streamliner.</p>
                        <Button onClick={handleFetchAccounts}>
                            Continue with Facebook
                        </Button>
                    </div>
                )}
                {(step === 2 || step === 4) && (
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground">{step === 2 ? 'Fetching your accounts...' : 'Connecting accounts...'}</p>
                    </div>
                )}
                {step === 3 && (
                    <div className="space-y-4">
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex w-full justify-between items-center font-semibold">
                          Facebook Pages <ChevronsUpDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {simulatedAccounts.filter(a => a.platform === 'Facebook').map(account => (
                            <AccountSelectItem 
                              key={account.id} 
                              account={account} 
                              isSelected={selectedAccountIds.includes(account.id)}
                              isDisabled={isAlreadyConnected(account.id)}
                              onToggle={() => {
                                if (isAlreadyConnected(account.id)) return;
                                setSelectedAccountIds(prev => 
                                  prev.includes(account.id) 
                                  ? prev.filter(id => id !== account.id) 
                                  : [...prev, account.id]
                                )
                              }}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                      <Collapsible defaultOpen>
                        <CollapsibleTrigger className="flex w-full justify-between items-center font-semibold">
                          Instagram Profiles <ChevronsUpDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
                          {simulatedAccounts.filter(a => a.platform === 'Instagram').map(account => (
                             <AccountSelectItem 
                              key={account.id} 
                              account={account} 
                              isSelected={selectedAccountIds.includes(account.id)}
                              isDisabled={isAlreadyConnected(account.id)}
                              onToggle={() => {
                                if (isAlreadyConnected(account.id)) return;
                                setSelectedAccountIds(prev => 
                                  prev.includes(account.id) 
                                  ? prev.filter(id => id !== account.id) 
                                  : [...prev, account.id]
                                )
                              }}
                            />
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                )}
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={step === 2 || step === 4}>
            Cancel
          </Button>
          <Button onClick={handleConnectAccounts} disabled={hasNoCredentials || step !== 3 || selectedAccountIds.length === 0}>
             Connect {selectedAccountIds.length > 0 ? `(${selectedAccountIds.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const AccountSelectItem = ({ account, isSelected, isDisabled, onToggle }: { account: (typeof simulatedAccounts)[0], isSelected: boolean, isDisabled: boolean, onToggle: () => void }) => {
  return (
    <div 
      onClick={onToggle}
      className={`flex items-center justify-between rounded-md border p-3 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed bg-muted/50' : 'cursor-pointer hover:bg-muted/50'} ${isSelected && 'bg-accent/20 border-accent'}`}
    >
      <div className="flex items-center gap-3">
        <PlatformIcon platform={account.platform} />
        <div className='flex flex-col'>
          <span className="font-medium">{account.displayName}</span>
          <span className="text-xs text-muted-foreground">{account.platform} {account.type}</span>
        </div>
      </div>
      {isDisabled ? <Badge variant="outline">Connected</Badge> : (
        <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
    </div>
  )
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
    
    deleteDocumentNonBlocking(docRef);
    toast({
        title: "Account Disconnected",
        description: "The account has been successfully disconnected."
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
        <AddAccountDialog apiCredentials={apiCredentials || []} existingAccounts={accounts || []}/>
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
