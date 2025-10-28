
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser, useFirebase } from '@/firebase';
import { Skeleton } from '../ui/skeleton';

export function UserProfile() {
  const { user, isUserLoading } = useUser();
  const { auth } = useFirebase();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>
          This is your user profile information. You can log out from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUserLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
            </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={user?.email || 'No email found'} readOnly disabled />
          </div>
        )}
         <Button variant="outline" onClick={handleLogout} className="w-full">
            Log Out
        </Button>
      </CardContent>
    </Card>
  );
}
