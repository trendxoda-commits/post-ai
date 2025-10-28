
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
import { DollarSign, Users, CreditCard, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


// Mock data for the dashboard
const mockUsers = [
  {
    name: 'Harish Kumar',
    email: 'harish.k@example.com',
    role: 'Admin',
    status: 'Active',
    lastLogin: '2 hours ago',
    avatar: 'https://picsum.photos/seed/1/40/40'
  },
  {
    name: 'Sunita Sharma',
    email: 'sunita.s@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '1 day ago',
    avatar: 'https://picsum.photos/seed/2/40/40'
  },
  {
    name: 'Raj Patel',
    email: 'raj.p@example.com',
    role: 'Viewer',
    status: 'Pending',
    lastLogin: '3 days ago',
    avatar: 'https://picsum.photos/seed/3/40/40'
  },
  {
    name: 'Anjali Verma',
    email: 'anjali.v@example.com',
    role: 'Editor',
    status: 'Active',
    lastLogin: '5 hours ago',
    avatar: 'https://picsum.photos/seed/4/40/40'
  },
  {
    name: 'Vikram Singh',
    email: 'vikram.s@example.com',
    role: 'Viewer',
    status: 'Inactive',
    lastLogin: '1 week ago',
    avatar: 'https://picsum.photos/seed/5/40/40'
  }
];

export default function AdminDashboardPage() {

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">$45,231.89</div>
                <p className="text-xs text-muted-foreground">
                +20.1% from last month
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Subscriptions
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+2350</div>
                <p className="text-xs text-muted-foreground">
                +180.1% from last month
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader
            >
            <CardContent>
                <div className="text-2xl font-bold">+12,234</div>
                <p className="text-xs text-muted-foreground">
                +19% from last month
                </p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                Active Now
                </CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">+573</div>
                <p className="text-xs text-muted-foreground">
                +201 since last hour
                </p>
            </CardContent>
            </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Last Login</TableHead>
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
                    <TableCell className="hidden md:table-cell">{user.role}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'}
                        className={user.status === 'Active' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : user.status === 'Pending' ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30' : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.lastLogin}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
