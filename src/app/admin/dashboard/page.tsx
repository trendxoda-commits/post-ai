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
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';
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

// A more specific type for the data coming from Firestore
interface FirestoreUserData {
    email: string;
    createdAt: Timestamp; // Expecting a Firestore Timestamp
    // other fields might exist, but we only care about these
}

export default function AdminDashboardPage() {
    const { firestore } = useFirebase();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { logout } = useAdminAuth();
    const router = useRouter();


    useEffect(() => {
        if (!firestore) {
            // Firestore is not ready yet, wait for it.
            // The loading state is already true, so we just return.
            return; 
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const usersCollectionRef = collection(firestore, 'users');
                const usersSnapshot = await getDocs(usersCollectionRef);

                const allUsers: AppUser[] = usersSnapshot.docs.map(userDoc => {
                    const userData = userDoc.data() as FirestoreUserData;
                    
                    // Safely handle the timestamp
                    let formattedDate = 'Unknown';
                    if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
                       formattedDate = format(userData.createdAt.toDate(), "PPP");
                    }

                    return {
                        id: userDoc.id,
                        email: userData.email || 'No email provided',
                        createdAt: formattedDate,
                    };
                });
                setUsers(allUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [firestore]); // This effect will re-run when firestore becomes available.
    
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
