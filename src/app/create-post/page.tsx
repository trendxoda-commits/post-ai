
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  CalendarIcon,
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { postToFacebook, postToInstagram } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { collection, doc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, set } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleHour, setScheduleHour] = useState<string>('12');
  const [scheduleMinute, setScheduleMinute] = useState<string>('00');

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const searchParams = useSearchParams();

  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts, isLoading: isLoadingAccounts } = useCollection<SocialAccount>(socialAccountsQuery);
  
  // Handle pre-selection from URL parameter
  useEffect(() => {
    const accountIdFromUrl = searchParams.get('accountId');
    if (accountIdFromUrl) {
      setSelectedAccountIds([accountIdFromUrl]);
    }
  }, [searchParams]);

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
  
  const isScheduling = !!scheduleDate;

  const handleSubmit = async () => {
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

    if (isScheduling) {
      await handleSchedulePost();
    } else {
      await handlePostNow();
    }
    
    setIsPosting(false);
  };
  
  const handleSchedulePost = async () => {
    if (!scheduleDate || !user || !firestore) return;

    const scheduledAt = set(scheduleDate, {
      hours: parseInt(scheduleHour),
      minutes: parseInt(scheduleMinute),
    });

    const scheduledPostsRef = collection(firestore, 'users', user.uid, 'scheduledPosts');

    try {
      await addDocumentNonBlocking(scheduledPostsRef, {
        userId: user.uid,
        socialAccountIds: selectedAccountIds,
        content: content,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        scheduledAt: scheduledAt.toISOString(),
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Post Scheduled!',
        description: `Your post has been scheduled for ${format(scheduledAt, 'PPP p')}.`,
      });
      // Reset form
      setContent('');
      setMediaUrl('');
      setSelectedAccountIds([]);
      setScheduleDate(undefined);
    } catch (error: any) {
      console.error('Failed to schedule post:', error);
      // The non-blocking function will emit a global error, which the listener will catch
    }
  }

  const handlePostNow = async () => {
    if (!user || !accounts) return;
    
    const accountsToPost = accounts.filter(acc => selectedAccountIds.includes(acc.id));

    let successCount = 0;
    let errorCount = 0;

    for (const account of accountsToPost) {
        if (!account.pageAccessToken) {
            console.error(`Skipping post for ${account.displayName}: Missing page access token.`);
            toast({
                variant: 'destructive',
                title: `Post Failed: ${account.displayName}`,
                description: 'Required Page Access Token is missing.',
            });
            errorCount++;
            continue;
        }

        try {
            if (account.platform === 'Facebook') {
                await postToFacebook({
                    facebookPageId: account.accountId,
                    mediaUrl: mediaUrl,
                    mediaType: mediaType,
                    caption: content,
                    pageAccessToken: account.pageAccessToken,
                });
            } else if (account.platform === 'Instagram') {
                await postToInstagram({
                    instagramUserId: account.accountId,
                    mediaUrl: mediaUrl,
                    mediaType: mediaType,
                    caption: content,
                    pageAccessToken: account.pageAccessToken,
                });
            }
            successCount++;
            toast({
                title: 'Post Successful!',
                description: `Content successfully posted to ${account.displayName}.`,
            });
        } catch (error: any) {
            errorCount++;
            console.error(`Failed to post to ${account.displayName}:`, error);
            toast({
                variant: 'destructive',
                title: `Post Failed: ${account.displayName}`,
                description: error.message || 'An unknown error occurred.',
            });
        }
    }
    
    if (errorCount === 0) {
        toast({
            title: 'All Posts Successful',
            description: `Successfully posted to all ${successCount} selected accounts.`,
        });
        // Reset form on full success
        setContent('');
        setMediaUrl('');
        setSelectedAccountIds([]);
    } else {
        toast({
            variant: 'destructive',
            title: 'Bulk Post Complete with Errors',
            description: `${successCount} posts succeeded, but ${errorCount} failed.`,
        });
    }
  };
  

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Create Post</h1>
        <p className="text-muted-foreground max-w-2xl">
          Craft your message, add your media, and publish it to your connected accounts now or later.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3 space-y-6">
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
                <DropdownMenuContent className="w-[350px] max-h-96 overflow-y-auto">
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

        <div className="lg:col-span-2 space-y-6">
          {/* Step 3: Publish */}
          <Card>
            <CardHeader>
              <CardTitle>3. Publish</CardTitle>
              <CardDescription>{isScheduling ? 'Set the date and time for your post.' : 'Publish your content to the selected accounts immediately.'}</CardDescription>
            </CardHeader>
            {isScheduling && (
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {scheduleDate ? format(scheduleDate, 'PPP') : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={scheduleDate}
                            onSelect={setScheduleDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <div className="flex gap-2">
                        <Select value={scheduleHour} onValueChange={setScheduleHour}>
                          <SelectTrigger>
                            <SelectValue placeholder="Hour" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map(hour => (
                              <SelectItem key={hour} value={hour}>{hour}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={scheduleMinute} onValueChange={setScheduleMinute}>
                          <SelectTrigger>
                            <SelectValue placeholder="Minute" />
                          </SelectTrigger>
                           <SelectContent>
                            {['00', '15', '30', '45'].map(min => (
                              <SelectItem key={min} value={min}>{min}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
              </CardContent>
            )}
            <CardFooter className="flex-col space-y-2">
              <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isPosting}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isScheduling ? 'Scheduling...' : 'Posting...'}</> : (isScheduling ? 'Schedule Post' : 'Post Now')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={() => setScheduleDate(isScheduling ? undefined : new Date())}
                disabled={isPosting}
              >
                {isScheduling ? 'Cancel Schedule' : 'Schedule for Later'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
