
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Link2, Send, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Mock data for the dashboard
const mockUsers = [
  {
    id: 'user-1',
    name: 'Harish Kumar',
    email: 'harish.k@example.com',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2 hours ago',
    avatar: 'https://picsum.photos/seed/1/40/40',
    accounts: [
      { id: 'acc-1-1', name: 'Harish\'s Insta', platform: 'Instagram' },
      { id: 'acc-1-2', name: 'Harish\'s Facebook', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-2',
    name: 'Sunita Sharma',
    email: 'sunita.s@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '1 day ago',
    avatar: 'https://picsum.photos/seed/2/40/40',
     accounts: [
      { id: 'acc-2-1', name: 'Sunita\'s Travel Blog', platform: 'Instagram' },
    ]
  },
  {
    id: 'user-3',
    name: 'Raj Patel',
    email: 'raj.p@example.com',
    role: 'Viewer',
    status: 'Pending',
    lastLogin: '3 days ago',
    avatar: 'https://picsum.photos/seed/3/40/40',
     accounts: [
      { id: 'acc-3-1', name: 'Raj\'s Food Page', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-4',
    name: 'Anjali Verma',
    email: 'anjali.v@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '5 hours ago',
    avatar: 'https://picsum.photos/seed/4/40/40',
    accounts: [
      { id: 'acc-4-1', name: 'Anjali\'s Art', platform: 'Instagram' },
      { id: 'acc-4-2', name: 'Anjali\'s Design Co.', platform: 'Facebook' },
    ]
  },
  {
    id: 'user-5',
    name: 'Vikram Singh',
    email: 'vikram.s@example.com',
    role: 'Viewer',
    status: 'Inactive',
    lastLogin: '1 week ago',
    avatar: 'https://picsum.photos/seed/5/40/40',
    accounts: []
  }
];

// Exporting mock data to be used in other admin pages
export { mockUsers };

export default function AdminDashboardPage() {

  const totalUsers = mockUsers.length;
  const totalAccounts = mockUsers.reduce((sum, user) => sum + user.accounts.length, 0);
  const totalPosts = 142; // mock number

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                Currently on the platform
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Connected Accounts
                </CardTitle>
                <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalAccounts}</div>
                <p className="text-xs text-muted-foreground">
                Across all users
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader
            >
            <CardContent>
                <div className="text-2xl font-bold">+{totalPosts.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                Published across all platforms
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                API Status
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">
                All systems operational
                </p>
            </CardContent>
            </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>An overview of all registered users and their connected accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="text-right">Connected Accounts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-0.5">
                                <p className="font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge 
                        variant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'}
                        className={user.status === 'Active' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : user.status === 'Pending' ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30' : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <p className="font-medium">{user.accounts.length}</p>
                       <p className="text-xs text-muted-foreground">
                          {user.accounts.map(a => a.platform.charAt(0)).join(', ') || 'None'}
                       </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}

    