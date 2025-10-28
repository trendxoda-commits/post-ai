
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { mockUsers } from '../dashboard/page';

// Flatten the accounts data from mock users
const allAccounts = mockUsers.flatMap(user => 
  user.accounts.map(account => ({
    ...account,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    followers: Math.floor(Math.random() * (user.totalFollowers || 0)), // Assign random followers for demo
    status: user.status === 'Active' ? 'Active' : 'Inactive',
  }))
).sort((a, b) => b.followers - a.followers);


export default function AdminAccountsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredAccounts = allAccounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Accounts</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connected Social Accounts</CardTitle>
          <CardDescription>
            A list of all social media accounts connected by users on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by account or user name..."
                className="pl-10 max-w-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="hidden sm:table-cell">Platform</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="hidden sm:table-cell text-center">User Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://picsum.photos/seed/${account.id}/40/40`} alt={account.name} />
                        <AvatarFallback>{account.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="grid gap-0.5">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{account.userName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={account.platform === 'Instagram' ? 'secondary' : 'default'} className={account.platform === 'Facebook' ? 'bg-blue-600/80 text-primary-foreground' : 'bg-pink-600/80 text-primary-foreground'}>
                      {account.platform}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {account.followers.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-center">
                    <Badge
                      variant={account.status === 'Active' ? 'default' : 'destructive'}
                      className={account.status === 'Active' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' : 'bg-red-500/20 text-red-700 hover:bg-red-500/30'}
                    >
                      {account.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
           {filteredAccounts.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p>No accounts found matching your search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
