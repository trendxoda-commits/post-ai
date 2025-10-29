'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, KeyRound, Edit, PlusCircle, Check, X } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import type { User, ApiCredential } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface UserWithCredential extends User {
  credential?: ApiCredential;
}

function CredentialDialog({ user, onSave }: { user: UserWithCredential, onSave: () => void }) {
    const [open, setOpen] = useState(false);
    const [appId, setAppId] = useState(user.credential?.appId || '');
    const [appSecret, setAppSecret] = useState(''); // Always start empty for security
    const [isLoading, setIsLoading] = useState(false);
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const handleSave = async () => {
        if (!user || !appId || !appSecret) {
            toast({
                variant: "destructive",
                title: "Missing Information",
                description: "Please fill out both App ID and App Secret.",
            });
            return;
        }

        setIsLoading(true);
        try {
            const docRef = user.credential?.id
                ? doc(firestore, 'users', user.id, 'apiCredentials', user.credential.id)
                : doc(collection(firestore, 'users', user.id, 'apiCredentials'));

            await setDoc(docRef, {
                userId: user.id,
                platform: 'Meta',
                appId,
                appSecret,
            }, { merge: true });

            toast({
                title: "Credentials Saved",
                description: `API keys for ${user.email} have been updated.`
            });
            onSave(); // Trigger a refresh of the user list
            setOpen(false);

        } catch (error: any) {
            console.error("Error saving credentials:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: "Could not save the credentials. Please try again."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                   {user.credential ? <><Edit className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Edit Keys</span></> : <><PlusCircle className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Add Keys</span></>}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage API Keys for {user.email}</DialogTitle>
                    <DialogDescription>
                        {user.credential ? 'Update the credentials for this user. The App Secret is required for any update.' : 'Add new credentials for this user.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="appId">App ID</Label>
                        <Input
                            id="appId"
                            value={appId}
                            onChange={(e) => setAppId(e.target.value)}
                            placeholder="Paste App ID"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="appSecret">App Secret</Label>
                        <Input
                            id="appSecret"
                            type="password"
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            placeholder="Paste new App Secret"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminCredentialsPage() {
  const { firestore } = useFirebase();
  const [users, setUsers] = useState<UserWithCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllUsersAndCredentials = async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userList: User[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      
      const enrichedUsers: UserWithCredential[] = [];

      for (const user of userList) {
        const credsSnapshot = await getDocs(collection(firestore, 'users', user.id, 'apiCredentials'));
        let userWithCred: UserWithCredential = { ...user };
        if (!credsSnapshot.empty) {
          const credData = credsSnapshot.docs[0].data() as ApiCredential;
          userWithCred.credential = { ...credData, id: credsSnapshot.docs[0].id };
        }
        enrichedUsers.push(userWithCred);
      }

      setUsers(enrichedUsers);
    } catch (error) {
      console.error("Failed to fetch user credentials:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchAllUsersAndCredentials();
  }, [firestore]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">API Credentials</h1>
        <p className="text-muted-foreground">
          View and manage Meta App credentials for all users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All User Credentials</CardTitle>
          <CardDescription>Each user can have one set of Meta API keys and one long-lived access token.</CardDescription>
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
                    <TableHead>User Email</TableHead>
                    <TableHead>Keys Status</TableHead>
                    <TableHead>App ID</TableHead>
                    <TableHead>Access Token</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">{user.email || 'N/A'}</div>
                        </TableCell>
                        <TableCell>
                          {user.credential?.appId ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <KeyRound className="h-3 w-3 mr-1.5" />
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Not Configured</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                            {user.credential?.appId ? (
                                <span className="font-mono text-sm">...{user.credential.appId.slice(-6)}</span>
                            ) : (
                                <span className="text-muted-foreground">---</span>
                            )}
                        </TableCell>
                        <TableCell>
                            {user.credential?.accessToken ? (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                  <Check className="h-3 w-3 mr-1.5" />
                                  Exists
                                </Badge>
                            ) : (
                                <Badge variant="outline">
                                   <X className="h-3 w-3 mr-1.5" />
                                   Missing
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                          <CredentialDialog user={user} onSave={fetchAllUsersAndCredentials} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No users found in the system.
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
