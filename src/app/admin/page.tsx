import { UserList } from '@/components/admin/user-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllUsersWithAccounts } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';


export default async function AdminPage() {
    
    let users = [];
    let error: string | null = null;
    
    try {
        users = await getAllUsersWithAccounts();
    } catch (e: any) {
        error = e.message || "An unexpected error occurred.";
    }

    return (
        <div className="bg-muted/40 min-h-screen">
             <header className="bg-background border-b p-4">
                <h1 className="text-2xl font-bold font-headline">Admin Panel</h1>
            </header>
            <main className="p-4 md:p-8 space-y-8">
                 <Alert variant="destructive" className="max-w-4xl mx-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Security Warning</AlertTitle>
                    <AlertDescription>
                        This admin panel is currently public and accessible without authentication. For production use, you must secure this endpoint.
                    </AlertDescription>
                </Alert>
                <Card className="max-w-4xl mx-auto">
                    <CardHeader>
                        <CardTitle>User Accounts</CardTitle>
                        <CardDescription>A list of all registered users and their connected social accounts.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error ? (
                             <div className="text-center py-10">
                                <p className="text-destructive font-semibold">Failed to load user data</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                             </div>
                        ) : (
                            <UserList users={users} />
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
