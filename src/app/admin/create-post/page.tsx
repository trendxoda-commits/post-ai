
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount, User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { triggerBulkPost } from '@/app/actions';


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


  const resetForm = () => {
    setContent('');
    setMediaUrl('');
    setMediaType('IMAGE');
    setSelectedAccountIds([]);
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
    
    setIsPosting(true);
    
    // Prepare the jobs for the background processor
    const jobs = allAccounts
      .filter(acc => selectedAccountIds.includes(acc.id))
      .map(account => {
        if (!account.pageAccessToken) {
          console.error(`Skipping post for ${account.displayName}: Missing page access token.`);
          return null;
        }
        return {
          platform: account.platform,
          accountId: account.accountId,
          pageAccessToken: account.pageAccessToken,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          caption: content,
        };
      })
      .filter(job => job !== null); // Filter out accounts with missing tokens

      if (jobs.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Valid Accounts',
            description: 'None of the selected accounts had the required access tokens to post.',
        });
        setIsPosting(false);
        return;
      }

    try {
        // "Fire-and-forget" call to the server action
        await triggerBulkPost({ jobs: jobs as any[] });

        toast({
            title: 'Bulk Post Started',
            description: `Posting to ${jobs.length} accounts in the background. You can safely leave this page.`,
        });

    } catch (error) {
        console.error("Error triggering bulk post:", error);
         toast({
            variant: 'destructive',
            title: 'Failed to Start Posting',
            description: 'Could not start the background posting job. Please try again.',
        });
    }


    setIsPosting(false);
    resetForm();
  };


  return (
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
                      <DropdownMenuContent className="w-full md:w-auto">
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
                  {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting...</> : `Post to ${selectedAccountIds.length} Account(s)`}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
  );
}
