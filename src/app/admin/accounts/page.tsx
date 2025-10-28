
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
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchComponent } from './search-component';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useCollection } from '@/firebase';
import { collectionGroup, query, getDocs, doc, getDoc, collection } from 'firebase/firestore';
import type { SocialAccount, User } from '@/lib/types';


// This interface will hold the merged account and user data
interface FullAccountDetails extends SocialAccount {
  user: {
    id: string;
    email?: string;
  };
}


export default function AdminAccountsPage() {
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<FullAccountDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // We will fetch all users first, then listen to their social accounts.
  // This is a more scalable approach for admin panels.
  useEffect(() => {
    if (!firestore) return;

    const fetchAllAccounts = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch all users to create a map of userId -> email
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userMap = new Map<string, string | undefined>();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as User;
            userMap.set(doc.id, userData.email);
        });

        // 2. Use a collectionGroup query to get all 'socialAccounts' across all users
        const accountsQuery = collectionGroup(firestore, 'socialAccounts');
        const accountsSnapshot = await getDocs(accountsQuery);
        
        const fetchedAccounts: FullAccountDetails[] = accountsSnapshot.docs.map(accountDoc => {
          const accountData = accountDoc.data() as SocialAccount;
          const userId = accountDoc.ref.parent.parent!.id; // Get parent user ID

          return {
            ...accountData,
            id: accountDoc.id, // The document ID of the socialAccount
            user: {
              id: userId,
              email: userMap.get(userId),
            },
          };
        });
        
        setAccounts(fetchedAccounts);

      } catch (error) {
        console.error("Failed to fetch admin accounts:", error);
        setAccounts([]); // Set to empty array on error
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllAccounts();

    // Note: A real-time listener for a collectionGroup can be expensive on reads.
    // For an admin panel, fetching once on load or periodically is often a better pattern.
    // If real-time is a strict requirement, onSnapshot can be used here, but be mindful of the cost.

  }, [firestore]);


  const query = searchParams.get('query')?.toLowerCase() || '';

  const filteredAccounts = useMemo(() => {
    if (!query) {
      return accounts;
    }
    return accounts.filter(
      (account) =>
        account.displayName.toLowerCase().includes(query) ||
        (account.user.email && account.user.email.toLowerCase().includes(query))
    );
  }, [accounts, query]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">All Connected Accounts</h1>
        <p className="text-muted-foreground">
          A list of all social media accounts connected by users across the application.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>A complete list of all connected accounts from all users.</CardDescription>
            </div>
            <SearchComponent />
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
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Followers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts && filteredAccounts.length > 0 ? (
                    filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="font-medium">{account.displayName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.platform === 'Instagram' ? 'destructive' : 'default'} className="bg-blue-500">
                            {account.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{account.user.email || 'N/A'}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold">{(account.followers || 0).toLocaleString()}</div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {query ? `No accounts found for "${query}".` : "No accounts have been connected yet."}
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
