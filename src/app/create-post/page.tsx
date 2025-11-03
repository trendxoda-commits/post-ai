
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Link as LinkIcon,
  ChevronDown,
} from 'lucide-react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { SocialAccount } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { postToFacebook, postToInstagram } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { collection } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isPosting, setIsPosting] = useState(false);

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

  const handleSubmit = async () => {
    if (selectedAccountIds.length === 0 || !mediaUrl) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select at least one account and provide a media URL to post.",
      });
      return;
    }
    if (!user || !accounts) return;

    setIsPosting(true);

    const accountsToPost = accounts.filter(acc => selectedAccountIds.includes(acc.id));
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const account of accountsToPost) {
      if (!account.pageAccessToken) {
        console.error(`Skipping post for ${account.displayName}: Missing page access token.`);
        errors.push(`Skipped ${account.displayName}: Missing token.`);
        errorCount++;
        continue;
      }

      try {
        if (account.platform === 'Facebook') {
          await postToFacebook({
            facebookPageId: account.accountId,
            mediaUrl,
            mediaType,
            caption: content,
            pageAccessToken: account.pageAccessToken,
          });
        } else if (account.platform === 'Instagram') {
          await postToInstagram({
            instagramUserId: account.accountId,
            mediaUrl,
            mediaType,
            caption: content,
            pageAccessToken: account.pageAccessToken,
          });
        }
        successCount++;
      } catch (error: any) {
        console.error(`Failed to post for ${account.displayName}:`, error);
        errors.push(`${account.displayName}: ${error.message}`);
        errorCount++;
      }
    }

    // Consolidated Toast Logic
    if (errorCount === 0) {
        toast({
            title: 'All Posts Successful!',
            description: `Successfully posted to ${successCount} account(s).`,
        });
        // Reset form on full success
        setContent('');
        setMediaUrl('');
        setSelectedAccountIds([]);
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
        <h1 className="text-3xl font-bold font-headline">Create Post</h1>
        <p className="text-muted-foreground max-w-2xl">
          Craft your message, add your media, and publish it to your connected accounts.
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
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* Step 2: Craft & Publish */}
          <Card>
            <CardHeader>
              <CardTitle>2. Craft & Publish</CardTitle>
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
            <CardFooter>
              <Button size="lg" className="w-full" onClick={handleSubmit} disabled={isPosting}>
                {isPosting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : 'Post Now'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
