
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
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { SocialAccount } from '@/lib/types';
import { SearchComponent } from './search-component';

// Server-side Firebase initialization
let adminApp: App;
if (!getApps().length) {
  adminApp = initializeApp({ projectId: firebaseConfig.projectId });
} else {
  adminApp = getApps()[0];
}
const firestore = getFirestore(adminApp);


interface FullAccountDetails extends SocialAccount {
    user: {
        id: string;
        email: string;
    };
}


async function getAllAccounts(): Promise<FullAccountDetails[]> {
    const allAccounts: FullAccountDetails[] = [];
    try {
        const usersSnapshot = await firestore.collection('users').get();
        
        for (const userDoc of usersSnapshot.docs) {
            const user = { id: userDoc.id, email: userDoc.data().email || 'N/A' };
            const socialAccountsSnapshot = await firestore.collection(`users/${userDoc.id}/socialAccounts`).get();
            
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
        return allAccounts;

    } catch (error) {
        console.error("Failed to fetch accounts on server:", error);
        return []; // Return empty array on error
    }
}


export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
  };
}) {

  const allAccounts = await getAllAccounts();
  const searchTerm = searchParams?.query || '';
  
  const filteredAccounts = allAccounts.filter(item =>
    item.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
    
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
                    <SearchComponent />
                </div>
            </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
