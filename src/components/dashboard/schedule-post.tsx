'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusCircle, Calendar as CalendarIcon, Clock, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { postToFacebook, postToInstagram } from '@/app/actions';
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"

export function SchedulePost() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
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

  const resetForm = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('IMAGE');
    setSelectedAccountId('');
    setScheduledDate(undefined);
    setScheduledTime('');
  };

  const handlePostNow = async () => {
    if (!selectedAccountId || !mediaUrl) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select an account and provide a media URL to post.",
      });
      return;
    }

    const selectedAccount = accounts?.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount || !selectedAccount.pageAccessToken) {
      toast({ variant: "destructive", title: "Error", description: "Selected account is invalid or missing permissions." });
      return;
    }

    setIsPosting(true);
    try {
      let result;
      if (selectedAccount.platform === 'Facebook') {
        result = await postToFacebook({
          facebookPageId: selectedAccount.accountId,
          mediaUrl,
          caption: content,
          pageAccessToken: selectedAccount.pageAccessToken,
          mediaType,
        });
      } else { // Instagram
        result = await postToInstagram({
          instagramUserId: selectedAccount.accountId,
          mediaUrl,
          caption: content,
          pageAccessToken: selectedAccount.pageAccessToken,
          mediaType,
        });
      }
      toast({
        title: 'Post Successful!',
        description: `Your post has been published to ${selectedAccount.displayName}. Post ID: ${result.postId}`,
      });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error posting now:", error);
      toast({
        variant: "destructive",
        title: 'Error Posting',
        description: error.message || 'There was an issue posting your content. Please try again.',
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSchedule = () => {
    if (!user || selectedAccounts.length === 0 || !scheduledDate || !scheduledTime) {
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
      socialAccountIds: [selectedAccountId],
      scheduledTime: scheduledDateTime.toISOString(),
      createdAt: new Date().toISOString(),
    }).then(() => {
        toast({
            title: 'Post Scheduled!',
            description: 'Your post has been successfully scheduled for publishing.',
        });
        setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Create a new post</DialogTitle>
          <DialogDescription>
            Craft your message, add your media, and then post it now or schedule it for later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
           <div className="space-y-2">
            <Label>Account</Label>
            <Select onValueChange={setSelectedAccountId} value={selectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account to post to" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.displayName} ({account.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Content / Caption</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              className="min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor="media-url">Media URL</Label>
             <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="media-url" placeholder="https://example.com/image.jpg or /video.mp4" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} className="pl-10"/>
             </div>
          </div>
           <div className="space-y-2">
              <Label>Media Type</Label>
              <RadioGroup
                defaultValue="IMAGE"
                className="flex items-center gap-4"
                value={mediaType}
                onValueChange={(value: 'IMAGE' | 'VIDEO') => setMediaType(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="IMAGE" id="r-image" />
                  <Label htmlFor="r-image">Image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="VIDEO" id="r-video" />
                  <Label htmlFor="r-video">Video</Label>
                </div>
              </RadioGroup>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Schedule Date</Label>
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
              <Label htmlFor="time">Schedule Time</Label>
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
        </div>
        <DialogFooter className='sm:justify-between'>
            <Button variant="secondary" onClick={handlePostNow} disabled={isPosting || isLoading}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
            </Button>
          <div className='flex gap-2'>
             <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading || isPosting}>
                Cancel
             </Button>
             <Button onClick={handleSchedule} disabled={isLoading || isPosting || !scheduledDate || !scheduledTime}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scheduling...</> : 'Schedule Post'}
             </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
