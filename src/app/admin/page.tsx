'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getAllUsersWithAccounts,
  type UserWithAccounts,
} from './actions';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

export default function AdminPage() {
  const [users, setUsers] = useState<UserWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedUsers = await getAllUsersWithAccounts();
        setUsers(fetchedUsers);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-destructive bg-destructive/10 rounded-lg p-4">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p className="font-semibold">Failed to load user data</p>
          <p className="text-sm text-center max-w-md mt-1">{error}</p>
           <p className="text-xs text-muted-foreground mt-4">Please ensure your Firebase Admin SDK credentials are correctly set in the `.env` file and are valid.</p>
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center h-64 flex justify-center items-center">
          <p className="text-muted-foreground">No registered users found.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Connected Accounts</TableHead>
            <TableHead className="text-right">Date Registered</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-muted-foreground">{user.id}</div>
              </TableCell>
              <TableCell>
                {user.socialAccounts.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {user.socialAccounts.map((account) => (
                      <Badge key={account.id} variant="secondary" className="flex items-center gap-2">
                         <Avatar className="h-4 w-4">
                            <AvatarImage src={account.avatar} />
                            <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                         </Avatar>
                        {account.displayName} ({account.platform})
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {user.createdAt ? format(parseISO(user.createdAt), 'PP') : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
        <p className="text-muted-foreground">
          A list of all registered users and their connected social accounts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </div>
  );
}
