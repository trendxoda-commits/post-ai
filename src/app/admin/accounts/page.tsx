
'use client';

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
import type { SocialAccount } from '@/lib/types';
import { useEffect, useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';


export default function AdminAccountsPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null),
    [firestore, user]
  );
  const { data: accounts, isLoading } = useCollection<SocialAccount>(socialAccountsQuery);
    
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">My Connected Accounts</h1>
        <p className="text-muted-foreground">
          A list of your social media accounts connected to the application.
        </p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Your Accounts</CardTitle>
                    <CardDescription>Accounts you have connected from the settings page.</CardDescription>
                </div>
            </div>
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
                        <TableHead>Account</TableHead>
                        <TableHead>Platform</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {accounts && accounts.length > 0 ? (
                            accounts.map((account) => (
                                <TableRow key={account.id}>
                                <TableCell>
                                    <div className="font-medium">{account.displayName}</div>
                                    <div className="text-xs text-muted-foreground">{account.accountId}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">{account.platform}</Badge>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                You have not connected any accounts yet.
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
