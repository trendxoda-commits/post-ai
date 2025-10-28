
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Loader2, KeyRound } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function AddCredentialDialog({ hasCredentials, existingCredentialId }: { hasCredentials?: boolean, existingCredentialId?: string }) {
  const [open, setOpen] = useState(false);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSaveCredential = () => {
    if (!user || !appId || !appSecret) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all fields.",
      });
      return;
    }
    setIsLoading(true);

    // If we have an existing ID, we update (set with merge), otherwise we create a new doc.
    const docRef = existingCredentialId 
        ? doc(firestore, 'users', user.uid, 'apiCredentials', existingCredentialId)
        : doc(collection(firestore, 'users', user.uid, 'apiCredentials'));

    setDocumentNonBlocking(docRef, {
      userId: user.uid,
      platform: 'Meta', // Hardcode to 'Meta' as one key set is used for both
      appId,
      appSecret,
    }, { merge: true }).then(() => {
        toast({
            title: `API Keys ${existingCredentialId ? 'Updated' : 'Added'}`,
            description: `Credentials for your Meta app have been saved.`,
        });
    }).catch((error) => {
        console.error("Error saving credential:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save credentials. Please try again.",
        });
    }).finally(() => {
        setIsLoading(false);
        setOpen(false);
        setAppId('');
        setAppSecret('');
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={hasCredentials}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add API Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingCredentialId ? 'Update' : 'Add'} Meta App API Keys</DialogTitle>
          <DialogDescription>
            {existingCredentialId ? 'Update' : 'Add'} your App ID and App Secret. These will be used to connect your Facebook and Instagram accounts. You only need to do this once.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="appId">
              App ID
            </Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Paste your App ID here"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="appSecret">
              App Secret
            </Label>
            <Input
              id="appSecret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder="Paste your App Secret here"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveCredential} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : 'Save Credentials'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ApiKeys() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const apiCredentialsQuery = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'apiCredentials') : null,
    [firestore, user]
  );
  const { data: credentials, isLoading } = useCollection<ApiCredential>(apiCredentialsQuery);

  const hasCredentials = credentials && credentials.length > 0;
  const credential = hasCredentials ? credentials[0] : null;

  const handleDelete = (credentialId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'apiCredentials', credentialId);
    
    deleteDocumentNonBlocking(docRef).catch((error) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not remove the credentials."
        });
        console.error("Error removing credentials: ", error);
    });
     toast({
        title: "Credentials Removed",
        description: "The selected API keys have been removed."
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage the Meta App ID and Secret used to connect your accounts. You should only have one set of keys.
          </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {credential ? (
                <div
                  key={credential.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary">
                        <KeyRound className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{credential.platform}</p>
                      <p className="text-sm text-muted-foreground">
                        App ID: &bull;&bull;&bull;&bull;{credential.appId.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(credential.id)}>
                      <Trash2 className="h-4 w-4 mr-2 sm:hidden" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No API keys saved yet.</p>
                <p className="text-sm text-muted-foreground">Add your Meta App keys to get started.</p>
                <div className="mt-4">
                    <AddCredentialDialog />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
