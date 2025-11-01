
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
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { executeScheduledPosts } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('10:00');

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

    const scheduledPostsRef = collection(firestore, 'users', user.uid, 'scheduledPosts');
    // We create a "scheduled post" for right now to be picked up by the background processor
    addDoc(scheduledPostsRef, {
        userId: user.uid,
        content: content,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        scheduledTime: new Date().toISOString(),
        socialAccountIds: selectedAccountIds,
        createdAt: serverTimestamp(),
        status: 'processing', // Mark as an immediate job
        isNow: true,
    }).then(() => {
        // Trigger the execution for the user
        executeScheduledPosts({ userId: user.uid });
    }).catch(err => {
        console.error(`Failed to create post job for user ${user.uid}:`, err);
    });

    toast({
        title: 'Posting Started',
        description: 'Your post is being sent in the background. Check the Activity page for its status.',
    });

    setIsPosting(false);
    resetForm();
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
        createdAt: serverTimestamp(),
        status: 'scheduled',
        isNow: false,
      });

      toast({
        title: 'Post Scheduled!',
        description: 'Your post has been successfully scheduled. Check the Activity page for status.',
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
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</> : 'Post Now'}
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
  );
}
