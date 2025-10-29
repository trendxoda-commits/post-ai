
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, User, PostJob } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { collection, collectionGroup, getDocs, addDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { processPostJob } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';


// This interface will hold the merged account and user data
interface FullAccountDetails extends SocialAccount {
  user: {
    id: string;
    email?: string;
  };
}

// Group accounts by platform for the dropdown
const groupAccountsByPlatform = (accounts: FullAccountDetails[]) => {
    if (!accounts) return {};
    return accounts.reduce((acc, account) => {
      const { platform } = account;
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    }, {} as Record<string, FullAccountDetails[]>);
};


export default function AdminCreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [allAccounts, setAllAccounts] = useState<FullAccountDetails[]>([]);

  // State for job report dialog
  const [jobId, setJobId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  // Fetch all accounts for selection
  useEffect(() => {
    if (!firestore) return;

    const fetchAllAccounts = async () => {
      setIsLoadingAccounts(true);
      try {
        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const userMap = new Map<string, string | undefined>();
        usersSnapshot.forEach(doc => {
            const userData = doc.data() as User;
            userMap.set(doc.id, userData.email);
        });

        const accountsQuery = collectionGroup(firestore, 'socialAccounts');
        const accountsSnapshot = await getDocs(accountsQuery);
        
        const fetchedAccounts: FullAccountDetails[] = accountsSnapshot.docs.map(accountDoc => {
          const accountData = accountDoc.data() as SocialAccount;
          const userId = accountDoc.ref.parent.parent!.id;

          return {
            ...accountData,
            id: accountDoc.id,
            user: {
              id: userId,
              email: userMap.get(userId),
            },
          };
        });
        
        setAllAccounts(fetchedAccounts);
      } catch (error) {
        console.error("Failed to fetch accounts:", error);
        toast({
            variant: 'destructive',
            title: 'Error Fetching Accounts',
            description: 'Could not load social accounts from the database.'
        })
      } finally {
        setIsLoadingAccounts(false);
      }
    };
    
    fetchAllAccounts();
  }, [firestore, toast]);


  // Auto-detect media type from URL
  useEffect(() => {
    if (mediaUrl.match(/\.(mp4|mov|avi)$/i)) {
      setMediaType('VIDEO');
    } else {
      setMediaType('IMAGE');
    }
  }, [mediaUrl]);
  
  const groupedAccounts = useMemo(() => groupAccountsByPlatform(allAccounts), [allAccounts]);


  const resetForm = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('IMAGE');
    setSelectedAccountIds([]);
    setJobId(null);
  };

 const handlePostNow = async () => {
    if (selectedAccountIds.length === 0 || !mediaUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select at least one account and provide a media URL to post.',
      });
      return;
    }
    if (!user) return;

    setIsPosting(true);
    
    // Create the job document in Firestore
    const jobData = {
        jobCreatorId: user.uid,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        content,
        mediaUrl,
        mediaType,
        targets: selectedAccountIds.map(accId => {
            const account = allAccounts.find(a => a.id === accId);
            return {
                socialAccountId: accId,
                userId: account?.user.id,
            }
        }),
        totalTargets: selectedAccountIds.length,
        successCount: 0,
        failureCount: 0,
        results: [],
    };

    try {
        const jobsRef = collection(firestore, 'users', user.uid, 'postJobs');
        const newJobDoc = await addDoc(jobsRef, jobData);
        
        // Fire-and-forget the background processing
        processPostJob({ jobId: newJobDoc.id, jobCreatorId: user.uid });
        
        setJobId(newJobDoc.id); // Start listening to this job
        
        toast({
            title: 'Bulk Post Job Started',
            description: 'Your posts are being published in the background. A report will appear when it is complete.',
        });
        
        resetForm(); // Reset form immediately for next use

    } catch (error: any) {
        console.error('Failed to create post job:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not start the posting job.' });
    } finally {
        setIsPosting(false);
    }
  };


  return (
    <>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline">Create Post (Admin)</h1>
          <p className="text-muted-foreground max-w-2xl">
            Publish content to any connected account across the entire platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Select Accounts</CardTitle>
                <CardDescription>Choose which accounts to post to.</CardDescription>
              </CardHeader>
              <CardContent>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between" disabled={isLoadingAccounts}>
                              {isLoadingAccounts
                                  ? 'Loading accounts...'
                                  : selectedAccountIds.length > 0
                                  ? `${selectedAccountIds.length} account(s) selected`
                                  : 'Select accounts to post to'}
                              <ChevronDown className="h-4 w-4" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                          <DropdownMenuLabel>All Accounts</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                              checked={selectedAccountIds.length === allAccounts.length && allAccounts.length > 0}
                              onSelect={(e) => e.preventDefault()}
                              onCheckedChange={(checked) => {
                                  setSelectedAccountIds(checked ? allAccounts.map(a => a.id) : []);
                              }}
                          >
                              Select All
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          <ScrollArea className="max-h-72">
                              {allAccounts && allAccounts.length > 0 ? (
                                  Object.entries(groupedAccounts).map(([platform, platformAccounts]) => (
                                      <div key={platform}>
                                          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{platform}</DropdownMenuLabel>
                                          {(platformAccounts as FullAccountDetails[]).map(account => (
                                              <DropdownMenuCheckboxItem
                                              key={account.id}
                                              checked={selectedAccountIds.includes(account.id)}
                                              onSelect={(e) => e.preventDefault()}
                                              onCheckedChange={(checked) => {
                                                  setSelectedAccountIds(prev =>
                                                  checked
                                                      ? [...prev, account.id]
                                                      : prev.filter(id => id !== account.id)
                                                  );
                                              }}
                                              >
                                              <Avatar className="h-6 w-6 mr-2">
                                                  <AvatarImage src={account.avatar} alt={account.displayName} />
                                                  <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                                              </Avatar>
                                              <div className="flex flex-col">
                                                  <span className="font-semibold">{account.displayName}</span>
                                                  <span className="text-xs text-muted-foreground">{account.user.email}</span>
                                              </div>
                                              </DropdownMenuCheckboxItem>
                                          ))}
                                      </div>
                                  ))
                              ) : (
                              <div className="p-2 text-sm text-center text-muted-foreground">
                                  No accounts found.
                              </div>
                              )}
                          </ScrollArea>
                      </DropdownMenuContent>
                  </DropdownMenu>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Post Composer */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>2. Craft & Publish</CardTitle>
                <CardDescription>Write your content, add media, and post to the selected accounts.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor="content">Caption</Label>
                  <Textarea
                      id="content"
                      placeholder="What's on your mind?"
                      className="min-h-[150px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="media-url">Media URL</Label>
                  <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="media-url" placeholder="Add a public media URL (e.g., .../image.jpg or .../video.mp4)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="pl-10" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button size="lg" className="w-full" onClick={handlePostNow} disabled={isPosting}>
                  {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting Job...</> : `Post to ${selectedAccountIds.length} Account(s)`}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <JobReportDialog
        jobId={jobId}
        allAccounts={allAccounts}
        show={showReport}
        onClose={() => {
            setShowReport(false);
            setJobId(null);
        }}
        onJobComplete={() => setShowReport(true)}
      />
    </>
  );
}


// A new component to handle the job listening and report display
function JobReportDialog({
    jobId,
    allAccounts,
    show,
    onClose,
    onJobComplete
}: {
    jobId: string | null;
    allAccounts: FullAccountDetails[];
    show: boolean;
    onClose: () => void;
    onJobComplete: () => void;
}) {
    const { firestore, user } = useFirebase();
    
    // Memoize the document reference
    const jobDocRef = useMemoFirebase(
        () => (user && jobId ? { path: `users/${user.uid}/postJobs/${jobId}` } : null),
        [user, jobId]
    );

    // Use useDoc to listen to the job document
    const { data: job, isLoading } = useDoc<PostJob>(jobDocRef && { ...firestore.doc(jobDocRef.path) });

    useEffect(() => {
        if (job && (job.status === 'completed' || job.status === 'failed')) {
            onJobComplete();
        }
    }, [job, onJobComplete]);
    
    if (!show || !job) {
        return null;
    }

    const failedPosts = job.results?.filter(r => r.status === 'rejected') || [];
    const successfulPosts = job.results?.filter(r => r.status === 'fulfilled') || [];

    const getAccountDetails = (socialAccountId: string) => {
        return allAccounts.find(acc => acc.id === socialAccountId);
    }

    return (
        <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {job.status === 'failed' && job.successCount === 0 ? (
                             <AlertCircle className="h-6 w-6 text-destructive" />
                        ) : (
                             <CheckCircle className="h-6 w-6 text-green-500" />
                        )}
                       Bulk Post Report
                    </DialogTitle>
                    <DialogDescription>
                        The background posting job has finished. Here is the summary.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 my-4">
                    <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-4xl">{successfulPosts.length}</CardTitle>
                            <CardDescription>Successful Posts</CardDescription>
                        </CardHeader>
                    </Card>
                     <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-4xl text-destructive">{failedPosts.length}</CardTitle>
                            <CardDescription>Failed Posts</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
                
                {failedPosts.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Failure Details:</h3>
                        <ScrollArea className="h-48 border rounded-md p-2">
                            <ul className="space-y-3">
                                {failedPosts.map((failure, index) => {
                                    const account = getAccountDetails(failure.socialAccountId);
                                    return (
                                        <li key={index} className="flex items-start gap-3 text-sm p-2 bg-muted/50 rounded-md">
                                            <AlertCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-bold">{account?.displayName || 'Unknown Account'}</p>
                                                <p className="text-xs text-muted-foreground">User: {account?.user?.email || 'N/A'}</p>
                                                <p className="text-destructive mt-1">{failure.reason}</p>
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={onClose}>Close Report</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

