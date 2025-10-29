
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, PostJob } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { executeScheduledPosts, processPostJob } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('10:00');
  
  // State for job report dialog
  const [jobId, setJobId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);


  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<SocialAccount>(socialAccountsQuery);

  // Group accounts by platform
  const groupedAccounts = useMemo(() => {
    if (!accounts) return {};
    return accounts.reduce((acc, account) => {
      const { platform } = account;
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(account);
      return acc;
    }, {} as Record<string, SocialAccount[]>);
  }, [accounts]);

  // Auto-detect media type from URL
  useEffect(() => {
    if (mediaUrl.match(/\.(mp4|mov|avi)$/i)) {
      setMediaType('VIDEO');
    } else {
      setMediaType('IMAGE');
    }
  }, [mediaUrl]);


  const resetForm = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('IMAGE');
    setSelectedAccountIds([]);
    setScheduleDate(undefined);
    setScheduleTime('10:00');
    setJobId(null);
  };

   const handlePostNow = async () => {
    if (selectedAccountIds.length === 0 || !mediaUrl) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select at least one account and provide a media URL to post.",
      });
      return;
    }
    if (!user) return;

    setIsPosting(true);
    
    const jobData = {
        jobCreatorId: user.uid,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        content,
        mediaUrl,
        mediaType,
        targets: selectedAccountIds.map(accId => ({
            socialAccountId: accId,
            userId: user.uid,
        })),
        totalTargets: selectedAccountIds.length,
        successCount: 0,
        failureCount: 0,
        results: [],
    };

    try {
        const jobsRef = collection(firestore, 'users', user.uid, 'postJobs');
        const newJobDoc = await addDoc(jobsRef, jobData);
        
        processPostJob({ jobId: newJobDoc.id, jobCreatorId: user.uid });
        
        setJobId(newJobDoc.id);
        
        toast({
            title: 'Bulk Post Job Started',
            description: 'Your posts are being published in the background. A report will appear when complete.',
        });
        
        resetForm();

    } catch (error: any) {
        console.error('Failed to create post job:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not start the posting job.' });
    } finally {
        setIsPosting(false);
    }
  };
  
    const handleSchedulePost = async () => {
    if (selectedAccountIds.length === 0 || !mediaUrl || !scheduleDate) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select accounts, provide media URL, and choose a date and time to schedule.',
      });
      return;
    }
    if (!user) return;

    setIsScheduling(true);

    try {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const scheduledDateTime = new Date(scheduleDate);
      scheduledDateTime.setHours(hours, minutes);

      const scheduledPostsRef = collection(firestore, 'users', user.uid, 'scheduledPosts');
      await addDoc(scheduledPostsRef, {
        userId: user.uid,
        content: content,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        scheduledTime: scheduledDateTime.toISOString(),
        socialAccountIds: selectedAccountIds,
        createdAt: new Date().toISOString(),
      });
      
      // Now we await the scheduler agent to check for due posts.
      await executeScheduledPosts({ userId: user.uid });

      toast({
        title: 'Post Scheduled!',
        description: 'Your post has been successfully scheduled and will be published automatically.',
      });
      resetForm();
    } catch (error: any) {
      console.error('Error scheduling post:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Schedule Post',
        description: error.message || 'There was an issue scheduling your post. Please try again.',
      });
    } finally {
      setIsScheduling(false);
    }
  };


  return (
    <>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline">Create Post</h1>
          <p className="text-muted-foreground max-w-2xl">
            Craft your message, add your media, and publish it to your connected accounts.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Accounts */}
            <Card>
              <CardHeader>
                <CardTitle>1. Select Accounts</CardTitle>
                <CardDescription>Choose which social media accounts you want to post to.</CardDescription>
              </CardHeader>
              <CardContent>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" disabled={isLoadingAccounts}>
                      <span>
                        {isLoadingAccounts 
                          ? "Loading accounts..."
                          : selectedAccountIds.length > 0
                          ? `${selectedAccountIds.length} account(s) selected`
                          : 'Select accounts to post to'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                    <DropdownMenuLabel>Your Accounts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {accounts && accounts.length > 0 ? (
                      <>
                      <DropdownMenuCheckboxItem
                          checked={selectedAccountIds.length === accounts.length}
                          onSelect={(e) => e.preventDefault()}
                          onCheckedChange={(checked) => {
                              setSelectedAccountIds(checked ? accounts.map(a => a.id) : []);
                          }}
                      >
                          Select All
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {Object.entries(groupedAccounts).map(([platform, platformAccounts]) => (
                          <div key={platform}>
                              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{platform}</DropdownMenuLabel>
                              {(platformAccounts as SocialAccount[]).map(account => (
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
                                  <span className="font-semibold">{account.displayName}</span>
                                  </DropdownMenuCheckboxItem>
                              ))}
                          </div>
                      ))}
                      </>
                    ) : (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        No accounts connected.
                      </div>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>

            {/* Step 2: Craft Post */}
            <Card>
              <CardHeader>
                <CardTitle>2. Craft Your Post</CardTitle>
                <CardDescription>Write your content and add a link to your media.</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Textarea
                  id="content"
                  placeholder="What's on your mind?"
                  className="min-h-[150px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="media-url" placeholder="Add a public media URL (e.g., .../image.jpg or .../video.mp4)" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="pl-10" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            {/* Step 3: Publish */}
            <Card>
              <CardHeader>
                <CardTitle>3. Publish</CardTitle>
                <CardDescription>Post your content to the selected accounts immediately.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary" size="lg" className="w-full" onClick={handlePostNow} disabled={isPosting || isScheduling}>
                  {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting Job...</> : 'Post Now'}
                </Button>
              </CardContent>
            </Card>
            
            {/* Step 4: Schedule */}
              <Card>
                  <CardHeader>
                  <CardTitle>Or Schedule for Later</CardTitle>
                  <CardDescription>Select a future date and time to publish your post automatically.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                  <Popover>
                      <PopoverTrigger asChild>
                      <Button
                          variant={"outline"}
                          className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduleDate && "text-muted-foreground"
                          )}
                      >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {scheduleDate ? format(scheduleDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                      <Calendar
                          mode="single"
                          selected={scheduleDate}
                          onSelect={setScheduleDate}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                      />
                      </PopoverContent>
                  </Popover>

                  <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="pl-10"
                      />
                  </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full" onClick={handleSchedulePost} disabled={isScheduling || isPosting}>
                        {isScheduling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : 'Schedule Post'}
                    </Button>
                  </CardFooter>
              </Card>

          </div>
        </div>
      </div>
      <JobReportDialog
          jobId={jobId}
          allAccounts={accounts || []}
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


function JobReportDialog({
    jobId,
    allAccounts,
    show,
    onClose,
    onJobComplete
}: {
    jobId: string | null;
    allAccounts: SocialAccount[];
    show: boolean;
    onClose: () => void;
    onJobComplete: () => void;
}) {
    const { firestore, user } = useFirebase();
    
    const jobDocRef = useMemoFirebase(
        () => (user && jobId ? { path: `users/${user.uid}/postJobs/${jobId}` } : null),
        [user, jobId]
    );

    const { data: job } = useDoc<PostJob>(jobDocRef && { ...firestore.doc(jobDocRef.path) });

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
            <DialogContent className="max-w-lg">
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
                            <CardDescription>Successful</CardDescription>
                        </CardHeader>
                    </Card>
                     <Card className="text-center">
                        <CardHeader>
                            <CardTitle className="text-4xl text-destructive">{failedPosts.length}</CardTitle>
                            <CardDescription>Failed</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
                
                {failedPosts.length > 0 && (
                    <div>
                        <h3 className="font-semibold mb-2">Failure Details:</h3>
                        <ScrollArea className="h-40 border rounded-md p-2">
                            <ul className="space-y-3">
                                {failedPosts.map((failure, index) => {
                                    const account = getAccountDetails(failure.socialAccountId);
                                    return (
                                        <li key={index} className="flex items-start gap-3 text-sm p-2 bg-muted/50 rounded-md">
                                            <AlertCircle className="h-4 w-4 text-destructive mt-1 shrink-0" />
                                            <div className="flex-grow">
                                                <p className="font-bold">{account?.displayName || 'Unknown Account'}</p>
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
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
