'use client';

import { Feed } from '@/components/dashboard/feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
       <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <Button asChild>
            <Link href="/create-post">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      <Feed />
    </div>
  );
}
