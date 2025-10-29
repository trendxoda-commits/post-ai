
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Loader2, Trash2, ListChecks, CheckCircle, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, collectionGroup, getDocs, writeBatch, query } from 'firebase/firestore';
import type { PostJob, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface FullJobDetails extends PostJob {
  user?: {
    email?: string;
  };
}

export default function AdminJobsPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<FullJobDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const fetchAllJobs = useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);

    try {
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const userMap = new Map<string, string | undefined>();
      usersSnapshot.forEach(doc => {
        const userData = doc.data() as User;
        userMap.set(doc.id, userData.email);
      });

      const jobsSnapshot = await getDocs(collectionGroup(firestore, 'postJobs'));
      
      const fetchedJobs: FullJobDetails[] = jobsSnapshot.docs.map(jobDoc => {
        const jobData = jobDoc.data() as PostJob;
        const userId = jobDoc.ref.parent.parent!.id;

        return {
          ...jobData,
          id: jobDoc.id,
          user: {
            email: userMap.get(userId),
          },
        };
      });

      // Sort by most recent first
      fetchedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setJobs(fetchedJobs);

    } catch (error) {
      console.error("Failed to fetch jobs:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load job data.' });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, toast]);

  useEffect(() => {
    fetchAllJobs();
  }, [fetchAllJobs]);

  const handleClearCompleted = async () => {
    if (!firestore) return;
    setIsClearing(true);

    try {
        const batch = writeBatch(firestore);
        const jobsToDeleteQuery = query(collectionGroup(firestore, 'postJobs'));
        const jobsSnapshot = await getDocs(jobsToDeleteQuery);

        let deleteCount = 0;
        jobsSnapshot.forEach(doc => {
            const job = doc.data() as PostJob;
            if (job.status === 'completed' || job.status === 'failed') {
                batch.delete(doc.ref);
                deleteCount++;
            }
        });
        
        await batch.commit();

        // Refresh the list locally
        setJobs(prev => prev.filter(job => job.status === 'pending'));

        toast({
            title: 'Jobs Cleared',
            description: `${deleteCount} completed or failed jobs have been cleared.`,
        });

    } catch (error) {
        console.error("Failed to clear jobs:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not clear completed jobs.' });
    } finally {
        setIsClearing(false);
    }
  }

  const getStatusBadge = (status: PostJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Pending</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Post Jobs</h1>
        <p className="text-muted-foreground">
          A live report of all bulk posting jobs initiated across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Job Status</CardTitle>
              <CardDescription>Live status of background posting tasks.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={fetchAllJobs} disabled={isLoading}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Refresh</span>
                </Button>
                <Button variant="destructive" onClick={handleClearCompleted} disabled={isClearing || isLoading}>
                    {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="hidden sm:inline ml-2">Clear Completed</span>
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Created</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Targets</TableHead>
                    <TableHead className="text-right">Success</TableHead>
                    <TableHead className="text-right">Failures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs && jobs.length > 0 ? (
                    jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                           <div className="font-medium">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{job.user?.email || 'N/A'}</div>
                        </TableCell>
                         <TableCell>
                            {getStatusBadge(job.status)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{job.totalTargets}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{job.successCount}</TableCell>
                        <TableCell className="text-right font-semibold text-red-600">{job.failureCount}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No active or recent jobs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
