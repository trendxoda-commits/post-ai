'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  Wand2,
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { postToFacebook, postToInstagram, generatePostCaption } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PostCard, FeedPost } from '@/components/dashboard/post-card';
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
  const [captionTopic, setCaptionTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);


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
    setScheduleDate(undefined);
    setScheduleTime('10:00');
    setCaptionTopic('');
  };

  const handleGenerateCaption = async () => {
    if (!captionTopic) {
      toast({
        variant: 'destructive',
        title: 'Topic is empty',
        description: 'Please enter a topic to generate a caption.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const { caption } = await generatePostCaption({ topic: captionTopic });
      setContent(caption);
    } catch (error: any) {
      console.error('Failed to generate caption:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to Generate Caption',
        description: error.message || 'There was a problem with the AI service.',
      });
    } finally {
      setIsGenerating(false);
    }
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

      toast({
        title: 'Post Scheduled!',
        description: 'Your post has been successfully scheduled.',
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
                  <Button variant="outline" className="w-full justify-between">
                    <span>
                      {selectedAccountIds.length > 0
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
                    accounts.map(account => (
                      <DropdownMenuCheckboxItem
                        key={account.id}
                        checked={selectedAccountIds.includes(account.id)}
                        onSelect={(e) => e.preventDefault()} // Prevents dropdown from closing on select
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
                        <span className="ml-auto text-xs text-muted-foreground">{account.platform}</span>
                      </DropdownMenuCheckboxItem>
                    ))
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
              <CardDescription>Write your content and add a link to your media. Use the AI assistant to generate captions.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                 <div className="space-y-2">
                  <Label>AI Caption Assistant</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Enter a topic, e.g., 'a beautiful sunset'"
                      value={captionTopic}
                      onChange={(e) => setCaptionTopic(e.target.value)}
                    />
                    <Button variant="outline" onClick={handleGenerateCaption} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      <span className="sr-only">Generate Caption</span>
                    </Button>
                  </div>
                </div>
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
              <CardDescription>Post your content to the selected accounts immediately.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" size="lg" className="w-full" onClick={handlePostNow} disabled={isPosting || isScheduling}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
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
                 <p className="text-xs text-muted-foreground text-center">Note: Scheduling backend is not yet implemented. This will save the post but not publish it.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={handleSchedulePost} disabled={isScheduling || isPosting || true}>
                      {isScheduling ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : 'Schedule Post'}
                  </Button>
                </CardFooter>
            </Card>

        </div>
      </div>
    </div>
  );
}
