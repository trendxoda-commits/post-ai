'use client';

import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '../layout';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type AppUser = {
  id: string;
  email: string;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const { firestore } = useFirebase();
  const { logout } = useAdminAuth();
  const router = useRouter();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!firestore) return; // Wait for firestore to be available
      
      setIsLoading(true);
      try {
        const usersCollection = collection(firestore, 'users');
        const userSnapshot = await getDocs(usersCollection);
        const userList = userSnapshot.docs.map(doc => {
            const data = doc.data();
            // Handle Firestore Timestamp
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : 'N/A';
            return {
                id: doc.id,
                email: data.email || 'No email',
                createdAt: createdAt
            };
        });
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [firestore]);

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-8">
       <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>Logout</Button>
        </div>
      
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>A list of all registered users in the application.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Date Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
             {users.length === 0 && !isLoading && (
                <div className="text-center py-10 text-muted-foreground">
                    <p>No users found.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
