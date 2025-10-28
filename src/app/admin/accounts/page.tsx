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
import { collection, getDocs, doc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

interface FullAccount {
    id: string;
    displayName: string;
    platform: 'Facebook' | 'Instagram';
    followers: number; // For now, this will be mocked
    status: 'Active' | 'Inactive';
    user: {
        id: string;
        email: string;
    };
}

// NOTE: In a real app, this data would be fetched from a server-side endpoint
// that uses the Firebase Admin SDK to aggregate data across all users.
// For this component, we'll fetch on the client side, which is not scalable or secure for production.
async function getAllAccounts(firestore: any) {
    const allAccounts: FullAccount[] = [];
    const usersSnapshot = await getDocs(collection(firestore, 'users'));

    for (const userDoc of usersSnapshot.docs) {
        const user = { id: userDoc.id, email: userDoc.data().email || 'N/A' };
        const socialAccountsSnapshot = await getDocs(collection(userDoc.ref, 'socialAccounts'));
        
        for (const accountDoc of socialAccountsSnapshot.docs) {
            const accountData = accountDoc.data();
            allAccounts.push({
                id: accountDoc.id,
                displayName: accountData.displayName,
                platform: accountData.platform,
                followers: Math.floor(Math.random() * 10000), // Placeholder
                status: 'Active', // Placeholder
                user: user
            });
        }
    }
    return allAccounts;
}


export default function AdminAccountsPage() {
    const { firestore } = useFirebase();
    const [accounts, setAccounts] = useState<FullAccount[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<FullAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        
        setIsLoading(true);
        getAllAccounts(firestore).then(fetchedAccounts => {
             // Sort by followers descending as a default
            fetchedAccounts.sort((a, b) => b.followers - a.followers);
            setAccounts(fetchedAccounts);
            setFilteredAccounts(fetchedAccounts);
            setIsLoading(false);
        });
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
                    <CardDescription>Search and manage all connected accounts.</CardDescription>
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
                        <TableHead>Platform</TableHead>
                        <TableHead className="text-right">Followers</TableHead>
                        <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAccounts.length > 0 ? (
                            filteredAccounts.map((account) => (
                                <TableRow key={account.id}>
                                <TableCell>
                                    <div className="grid gap-0.5">
                                        <p className="font-medium">{account.displayName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {account.user.email}
                                        </p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">{account.platform}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {account.followers.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={account.status === 'Active' ? 'secondary' : 'outline'}>
                                        {account.status}
                                    </Badge>
                                </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                No accounts found.
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
