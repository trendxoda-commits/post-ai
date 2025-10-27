'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  Link as LinkIcon,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, Post } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { postToFacebook, postToInstagram } from '@/app/actions';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PostCard, FeedPost } from '@/components/dashboard/post-card';


export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const socialAccountsQuery = useMemoFirebase(() =>
    user ? collection(firestore, 'users', user.uid, 'socialAccounts') : null,
    [firestore, user]
  );
  const { data: accounts } = useCollection<SocialAccount>(socialAccountsQuery);

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
    setScheduledDate(undefined);
    setScheduledTime('');
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

    setIsPosting(true);
    let successCount = 0;
    let errorCount = 0;

    for (const accountId of selectedAccountIds) {
      const selectedAccount = accounts?.find(acc => acc.id === accountId);
      if (!selectedAccount || !selectedAccount.pageAccessToken) {
        toast({ variant: "destructive", title: `Error with ${selectedAccount?.displayName}`, description: "Account is invalid or missing permissions." });
        errorCount++;
        continue;
      }

      try {
        if (selectedAccount.platform === 'Facebook') {
          await postToFacebook({
            facebookPageId: selectedAccount.accountId,
            mediaUrl,
            caption: content,
            pageAccessToken: selectedAccount.pageAccessToken,
            mediaType,
          });
        } else { // Instagram
          await postToInstagram({
            instagramUserId: selectedAccount.accountId,
            mediaUrl,
            caption: content,
            pageAccessToken: selectedAccount.pageAccessToken,
            mediaType,
          });
        }
        successCount++;
      } catch (error: any) {
        console.error(`Error posting to ${selectedAccount.displayName}:`, error);
        toast({
          variant: "destructive",
          title: `Error Posting to ${selectedAccount.displayName}`,
          description: error.message || 'There was an issue posting your content. Please try again.',
        });
        errorCount++;
      }
    }

    setIsPosting(false);

    if (successCount > 0) {
      toast({
        title: 'Post Successful!',
        description: `${successCount} post(s) have been published.`,
      });
    }

    if (errorCount === 0) {
      resetForm();
    }
  };

  const handleSchedule = () => {
    if (!user || selectedAccountIds.length === 0 || !scheduledDate || !scheduledTime) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all fields before scheduling.",
      });
      return;
    }

    setIsLoading(true);

    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledDateTime = new Date(scheduledDate);
    scheduledDateTime.setHours(hours, minutes);

    const postsCollection = collection(firestore, 'users', user.uid, 'scheduledPosts');
    addDocumentNonBlocking(postsCollection, {
      userId: user.uid,
      content,
      mediaUrl,
      mediaType,
      socialAccountIds: selectedAccountIds,
      scheduledTime: scheduledDateTime.toISOString(),
      createdAt: new Date().toISOString(),
    }).then(() => {
      toast({
        title: 'Post Scheduled!',
        description: 'Your post has been successfully scheduled for publishing.',
      });
      resetForm();
    }).catch((error) => {
      console.error("Error scheduling post: ", error);
      toast({
        variant: "destructive",
        title: 'Error scheduling post',
        description: 'There was an issue scheduling your post. Please try again.',
      });
    }).finally(() => {
      setIsLoading(false);
    });
  };
  
    // Create a mock post object for the preview
  const previewPost: FeedPost = {
    id: 'preview-post',
    accountId: selectedAccountIds[0] || 'user',
    accountDisplayName: accounts?.find(a => a.id === selectedAccountIds[0])?.displayName || 'Your Account',
    accountAvatar: accounts?.find(a => a.id === selectedAccountIds[0])?.avatar || `https://picsum.photos/seed/avatar/40/40`,
    accountPlatform: 'Instagram', // Default to IG for preview styling
    content: content || 'Your caption will appear here...',
    mediaUrl: mediaUrl,
    mediaType: mediaType,
    likes: 0,
    comments: 0,
    views: 0,
    timestamp: new Date().toISOString(),
    permalink: '#',
  };


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Create Post</h1>
        <p className="text-muted-foreground max-w-2xl">
          Craft your message, add your media, and then post it now or schedule it for later.
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedAccountIds.length > 0
                      ? `${selectedAccountIds.length} account(s) selected`
                      : "Select accounts to post to..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search accounts..." />
                    <CommandList>
                      <CommandEmpty>No accounts found.</CommandEmpty>
                      <CommandGroup>
                        {accounts?.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={account.displayName}
                            onSelect={(currentValue) => {
                                 const accountId = accounts.find(acc => acc.displayName.toLowerCase() === currentValue.toLowerCase())?.id;
                                if (!accountId) return;

                                setSelectedAccountIds(prev =>
                                    prev.includes(accountId)
                                    ? prev.filter(id => id !== accountId)
                                    : [...prev, accountId]
                                );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAccountIds.includes(account.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {account.displayName} ({account.platform})
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          {/* Step 2: Craft Post */}
          <Card>
            <CardHeader>
              <CardTitle>2. Craft Your Post</CardTitle>
              <CardDescription>Write your content and add a link to your media. The media type will be auto-detected.</CardDescription>
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
          
           {/* Live Preview */}
            <Card>
                <CardHeader>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>This is how your post will approximately look on Instagram.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full max-w-sm mx-auto">
                        <PostCard post={previewPost} isPreview={true} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Step 3: Publish */}
          <Card>
            <CardHeader>
              <CardTitle>3. Publish</CardTitle>
              <CardDescription>Post immediately or schedule for a later time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="secondary" size="lg" className="w-full" onClick={handlePostNow} disabled={isPosting || isLoading}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
              </Button>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="date" className="font-semibold">Schedule Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time" className="font-semibold">Schedule Time</Label>
                  <div className='relative'>
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSchedule} disabled={isLoading || isPosting || !scheduledDate || !scheduledTime} className="w-full">
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : 'Schedule Post'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
