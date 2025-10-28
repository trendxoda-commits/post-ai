
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
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { SocialAccount, User } from '@/lib/types';


interface FullAccountDetails extends SocialAccount {
    user: {
        id: string;
        email: string;
    };
}


export default function AdminAccountsPage() {
    const { firestore } = useFirebase();
    const [accounts, setAccounts] = useState<FullAccountDetails[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<FullAccountDetails[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        
        const fetchAllAccounts = async () => {
            setIsLoading(true);
            const allAccounts: FullAccountDetails[] = [];
            try {
                const usersSnapshot = await getDocs(collection(firestore, 'users'));
                
                for (const userDoc of usersSnapshot.docs) {
                    const user = { id: userDoc.id, email: userDoc.data().email || 'N/A' };
                    const socialAccountsSnapshot = await getDocs(collection(userDoc.ref, 'socialAccounts'));
                    
                    socialAccountsSnapshot.forEach(accountDoc => {
                        const accountData = accountDoc.data() as SocialAccount;
                        allAccounts.push({
                            ...accountData,
                            id: accountDoc.id,
                            user: user,
                        });
                    });
                }
                
                allAccounts.sort((a, b) => a.displayName.localeCompare(b.displayName));
                setAccounts(allAccounts);
                setFilteredAccounts(allAccounts);

            } catch (error) {
                console.error("Failed to fetch accounts:", error);
                setAccounts([]);
                setFilteredAccounts([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchAllAccounts();

    }, [firestore]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        const filteredData = accounts.filter(item =>
            item.displayName.toLowerCase().includes(lowercasedFilter) ||
            item.user.email.toLowerCase().includes(lowercasedFilter)
        );
        setFilteredAccounts(filteredData);
    }, [searchTerm, accounts]);
    
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Accounts</h1>
        <p className="text-muted-foreground">
          A list of all social media accounts connected by your users.
        </p>
      </div>

      <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>All Connected Accounts</CardTitle>
                    <CardDescription>Search and manage all connected accounts from the database.</CardDescription>
                </div>
                 <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by account or user email..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="rounded-lg border">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Account</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Platform</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAccounts.length > 0 ? (
                            filteredAccounts.map((account) => (
                                <TableRow key={account.id}>
                                <TableCell>
                                    <div className="font-medium">{account.displayName}</div>
                                    <div className="text-xs text-muted-foreground">{account.accountId}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">{account.user.email}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">{account.platform}</Badge>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                No accounts found in the database.
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
