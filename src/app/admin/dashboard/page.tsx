'use client';

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
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase';
import { collection, getDocs, query, type User as FirestoreUser } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAdminAuth } from '../layout';
import { useRouter } from 'next/navigation';

interface AppUser {
    id: string;
    email: string;
    createdAt: string;
}

export default function AdminDashboardPage() {
    const { firestore } = useFirebase();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { logout } = useAdminAuth();
    const router = useRouter();


    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const usersCollectionRef = collection(firestore, 'users');
                const usersSnapshot = await getDocs(usersCollectionRef);

                const allUsers: AppUser[] = [];
                 for (const userDoc of usersSnapshot.docs) {
                    const userData = userDoc.data() as FirestoreUser;

                    // Fetch user details from a potential sub-collection or from the main doc itself
                    // This is a simplified example. In a real app, user details might be structured differently.
                    allUsers.push({
                        id: userDoc.id,
                        email: userData.email || 'No email provided',
                        createdAt: userData.createdAt ? format(new Date(userData.createdAt), "PPP") : 'Unknown',
                    });
                }
                setUsers(allUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [firestore]);
    
    const handleLogout = () => {
        logout();
        router.push('/admin/login');
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                 <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
                 <Button variant="outline" onClick={handleLogout}>Logout</Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>A list of all registered users in the application.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Date Registered</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-mono text-xs">{user.id}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.createdAt}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
