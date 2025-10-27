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
import { PlusCircle, Calendar as CalendarIcon, Clock, Loader2, Link as LinkIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';

export function SchedulePost() {
  const [open, setOpen] = useState(false);
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
      setOpen(false);
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
            <Label>Accounts</Label>
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
                                        onSelect={() => {
                                            setSelectedAccountIds(prev => 
                                                prev.includes(account.id)
                                                    ? prev.filter(id => id !== account.id)
                                                    : [...prev, account.id]
                                            )
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
        <DialogFooter className='pt-4 flex-col sm:flex-row sm:justify-between'>
            <Button variant="secondary" onClick={handlePostNow} disabled={isPosting || isLoading}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
            </Button>
          <div className='flex gap-2 justify-end'>
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
