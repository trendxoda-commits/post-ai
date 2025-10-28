'use client';

import type { UserWithAccounts } from '@/app/admin/actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface UserListProps {
  users: UserWithAccounts[];
}

const PlatformIcon = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => {
  const Icon = platform === 'Instagram'
    ? (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      )
    : (
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      );
  return Icon;
};


export function UserList({ users }: UserListProps) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-muted-foreground">No users found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Connected Accounts</TableHead>
          <TableHead className="text-right">Date Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.id}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {user.socialAccounts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.socialAccounts.map((account) => (
                    <Badge key={account.id} variant="secondary" className="flex items-center gap-2">
                        <Avatar className="h-4 w-4">
                            <AvatarImage src={account.avatar} alt={account.displayName} />
                            <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                        </Avatar>
                      <span>{account.displayName}</span>
                       <PlatformIcon platform={account.platform} />
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">None</span>
              )}
            </TableCell>
            <TableCell className="text-right">
                {user.createdAt ? format(new Date(user.createdAt), 'PPP') : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
