'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  Users,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { postToFacebook, postToInstagram } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';


// This interface will hold the merged account and user data
interface FullAccountDetails extends SocialAccount {
  user: {
    id: string;
    email?: string;
  };
}

export default function AdminCreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [allAccounts, setAllAccounts] = useState<FullAccountDetails[]>([]);

  const [minFollowers, setMinFollowers] = useState('');
  const [maxFollowers, setMaxFollowers] = useState('');

  const [openCombobox, setOpenCombobox] = useState(false);


  const { toast } = useToast();
  const { firestore } = useFirebase();

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


  const resetForm = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('IMAGE');
    setSelectedAccountIds([]);
  };

  const handleSelectByFollowers = () => {
    const min = minFollowers ? parseInt(minFollowers, 10) : 0;
    const max = maxFollowers ? parseInt(maxFollowers, 10) : Infinity;

    if (isNaN(min) || isNaN(max)) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter valid numbers for follower counts.' });
      return;
    }
    
    const matchingAccounts = allAccounts.filter(account => {
        const followers = account.followers || 0;
        return followers >= min && followers <= max;
    });

    setSelectedAccountIds(matchingAccounts.map(a => a.id));

    toast({
        title: 'Accounts Selected',
        description: `${matchingAccounts.length} accounts matching your criteria have been selected.`
    })
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
    let successfulPostsCount = 0;

    for (const accountId of selectedAccountIds) {
      const selectedAccount = allAccounts.find(acc => acc.id === accountId);
      if (!selectedAccount || !selectedAccount.pageAccessToken) {
        toast({ variant: "destructive", title: `Error with ${selectedAccount?.displayName}`, description: "Account is invalid or missing permissions." });
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
        successfulPostsCount++;
      } catch (error: any) {
        console.error(`Error posting to ${selectedAccount.displayName}:`, error);
        toast({
          variant: "destructive",
          title: `Error Posting to ${selectedAccount.displayName}`,
          description: error.message || 'There was an issue posting your content. Please try again.',
        });
      }
    }

    setIsPosting(false);

    if (successfulPostsCount > 0) {
        toast({
            title: 'Post Successful!',
            description: `${successfulPostsCount} post(s) have been published.`,
        });
    }

    if (successfulPostsCount === selectedAccountIds.length) { // Only reset if all were successful
      resetForm();
    }
  };


  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Create Post (Admin)</h1>
        <p className="text-muted-foreground max-w-2xl">
          Publish content to any connected account across the entire platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Accounts Manually</CardTitle>
              <CardDescription>Choose which social media accounts you want to post to from all users.</CardDescription>
            </CardHeader>
            <CardContent>
               <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between"
                    disabled={isLoadingAccounts}
                  >
                    <span className="truncate">
                      {isLoadingAccounts
                        ? 'Loading accounts...'
                        : selectedAccountIds.length > 0
                        ? `${selectedAccountIds.length} account(s) selected`
                        : 'Select accounts to post to'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search by account or email..." />
                    <CommandList>
                      <CommandEmpty>No accounts found.</CommandEmpty>
                      <CommandGroup>
                        {allAccounts.map(account => (
                          <CommandItem
                            key={account.id}
                            value={`${account.displayName} ${account.user.email}`}
                            onSelect={() => {
                              setSelectedAccountIds(prev =>
                                prev.includes(account.id)
                                  ? prev.filter(id => id !== account.id)
                                  : [...prev, account.id]
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                selectedAccountIds.includes(account.id)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                             <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={account.avatar} alt={account.displayName} />
                                <AvatarFallback>{account.displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-semibold">{account.displayName}</span>
                                <span className="text-xs text-muted-foreground">{account.user.email}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                     {allAccounts.length > 0 && (
                        <CommandGroup className='border-t pt-1 mt-1'>
                             <CommandItem
                                onSelect={() => {
                                    if (selectedAccountIds.length === allAccounts.length) {
                                        setSelectedAccountIds([]);
                                    } else {
                                        setSelectedAccountIds(allAccounts.map(a => a.id));
                                    }
                                }}
                                className='justify-center text-center'
                            >
                                {selectedAccountIds.length === allAccounts.length ? 'Deselect All' : 'Select All'}
                            </CommandItem>
                        </CommandGroup>
                    )}
                  </Command>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

           {/* Step 1.5: Select by Followers */}
            <Card>
                <CardHeader>
                    <CardTitle>Or, Select by Follower Count</CardTitle>
                    <CardDescription>Automatically select accounts based on their number of followers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="min-followers">Min Followers</Label>
                            <Input id="min-followers" type="number" placeholder="e.g., 1000" value={minFollowers} onChange={(e) => setMinFollowers(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="max-followers">Max Followers</Label>
                            <Input id="max-followers" type="number" placeholder="e.g., 50000" value={maxFollowers} onChange={(e) => setMaxFollowers(e.target.value)} />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setSelectedAccountIds([])}>Clear Selection</Button>
                    <Button onClick={handleSelectByFollowers} disabled={isLoadingAccounts}>
                        <Users className="mr-2 h-4 w-4" />
                        Select Accounts
                    </Button>
                </CardFooter>
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
              <Button variant="secondary" size="lg" className="w-full" onClick={handlePostNow} disabled={isPosting}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
