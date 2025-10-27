
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Trash2, Loader2, KeyRound } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function AddCredentialDialog() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<'Instagram' | 'Facebook' | ''>('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const handleAddCredential = () => {
    if (!user || !platform || !appId || !appSecret) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all fields.",
      });
      return;
    }
    setIsLoading(true);

    const credentialsCollection = collection(firestore, 'users', user.uid, 'apiCredentials');
    addDocumentNonBlocking(credentialsCollection, {
      userId: user.uid,
      platform,
      appId,
      appSecret,
    }).then(() => {
        toast({
            title: 'API Keys Added',
            description: `Credentials for ${platform} have been saved.`,
        });
    }).catch((error) => {
        console.error("Error adding credential:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not save credentials. Please try again.",
        });
    }).finally(() => {
        setIsLoading(false);
        setOpen(false);
        setPlatform('');
        setAppId('');
        setAppSecret('');
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add API Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add API Keys</DialogTitle>
          <DialogDescription>
            Add new App ID and App Secret for a platform. These will be used to connect your social accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="platform" className="text-right">
              Platform
            </Label>
            <Select onValueChange={(value: 'Instagram' | 'Facebook') => setPlatform(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="appId" className="text-right">
              App ID
            </Label>
            <Input
              id="appId"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="col-span-3"
              placeholder="Paste your App ID here"
            />
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="appSecret" className="text-right">
              App Secret
            </Label>
            <Input
              id="appSecret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className="col-span-3"
              placeholder="Paste your App Secret here"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAddCredential} disabled={isLoading}>
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

  const handleDelete = (credentialId: string) => {
    if (!user) return;
    const docRef = doc(firestore, 'users', user.uid, 'apiCredentials', credentialId);
    
    toast({
        title: "Credentials Removed",
        description: "The selected API keys are being removed."
    });

    deleteDocumentNonBlocking(docRef).catch((error) => {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not remove the credentials."
        });
        console.error("Error removing credentials: ", error);
    });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your App ID and App Secret for each platform.
          </CardDescription>
        </div>
        <AddCredentialDialog />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {credentials && credentials.length > 0 ? (
              credentials.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-secondary">
                        <KeyRound className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">{cred.platform}</p>
                      <p className="text-sm text-muted-foreground">
                        App ID: &bull;&bull;&bull;&bull;{cred.appId.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDelete(cred.id)}>
                      <Trash2 className="h-4 w-4 mr-2 sm:hidden" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No API keys saved yet.</p>
                <p className="text-sm text-muted-foreground">Add your first set of API keys to get started.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
