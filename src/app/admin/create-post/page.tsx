
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
import { useFirebase, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { scheduleFacebookPost, scheduleInstagramPost, postToFacebook, postToInstagram } from '@/app/actions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, set } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleHour, setScheduleHour] = useState<string>('12');
  const [scheduleMinute, setScheduleMinute] = useState<string>('00');

  const { toast } = useToast();
  const { firestore } = useFirebase();

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
  
  const isScheduling = !!scheduleDate;

  const handleSubmit = async () => {
    if (selectedAccountIds.length === 0 || !mediaUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please select at least one account and provide a media URL to post.',
      });
      return;
    }

    setIsPosting(true);

    const accountsToPost = allAccounts.filter(acc => selectedAccountIds.includes(acc.id));
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const scheduleTimestamp = isScheduling
      ? set(scheduleDate, {
          hours: parseInt(scheduleHour),
          minutes: parseInt(scheduleMinute),
        }).getTime() / 1000 // Unix timestamp in seconds
      : undefined;

    for (const account of accountsToPost) {
      if (!account.pageAccessToken) {
        console.error(`Skipping post for ${account.displayName}: Missing page access token.`);
        errors.push(`Skipped ${account.displayName}: Missing token.`);
        errorCount++;
        continue;
      }

      try {
        if (account.platform === 'Facebook') {
          if (isScheduling && scheduleTimestamp) {
            await scheduleFacebookPost({
              facebookPageId: account.accountId,
              mediaUrl,
              mediaType,
              caption: content,
              pageAccessToken: account.pageAccessToken,
              scheduledPublishTime: Math.floor(scheduleTimestamp),
            });
          } else {
            await postToFacebook({
              facebookPageId: account.accountId,
              mediaUrl,
              mediaType,
              caption: content,
              pageAccessToken: account.pageAccessToken,
            });
          }
        } else if (account.platform === 'Instagram') {
          if (isScheduling && scheduleTimestamp) {
            await scheduleInstagramPost({
              instagramUserId: account.accountId,
              mediaUrl,
              mediaType,
              caption: content,
              pageAccessToken: account.pageAccessToken,
              scheduledPublishTime: Math.floor(scheduleTimestamp),
            });
          } else {
            await postToInstagram({
              instagramUserId: account.accountId,
              mediaUrl,
              mediaType,
              caption: content,
              pageAccessToken: account.pageAccessToken,
            });
          }
        }
        successCount++;
      } catch (error: any) {
        console.error(`Failed to post/schedule for ${account.displayName}:`, error);
        errors.push(`${account.displayName}: ${error.message}`);
        errorCount++;
      }
    }

    // Consolidated Toast Logic
    if (errorCount === 0) {
        toast({
            title: isScheduling ? 'All Posts Scheduled!' : 'All Posts Successful!',
            description: `Successfully ${isScheduling ? 'scheduled' : 'posted'} to ${successCount} account(s).`,
        });
        // Reset form on full success
        setContent('');
        setMediaUrl('');
        setSelectedAccountIds([]);
        setScheduleDate(undefined);
    } else {
        toast({
            variant: 'destructive',
            title: `Complete with ${errorCount} Error(s)`,
            description: `Succeeded: ${successCount}. Failed: ${errorCount}. Check console for details.`,
        });
    }

    setIsPosting(false);
  };


  return (
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline">Create Post (Admin)</h1>
          <p className="text-muted-foreground max-w-2xl">
            Publish content to any connected account across the entire platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-2 space-y-6">
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
                      <DropdownMenuContent className="w-[350px] max-h-96 overflow-y-auto">
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
                          
                      </DropdownMenuContent>
                  </DropdownMenu>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Post Composer */}
          <div className="md:col-span-3">
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

                {isScheduling && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
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
                )}


              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                 <Button
                    size="lg"
                    className="w-full"
                    onClick={handleSubmit}
                    disabled={isPosting}
                  >
                    {isPosting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isScheduling ? 'Scheduling...' : 'Posting...'}</>
                    ) : (
                      isScheduling ? `Schedule for ${selectedAccountIds.length} Account(s)` : `Post to ${selectedAccountIds.length} Account(s)`
                    )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  onClick={() => setScheduleDate(isScheduling ? undefined : new Date())}
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
