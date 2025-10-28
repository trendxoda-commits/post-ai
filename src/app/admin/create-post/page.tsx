
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Package2 } from 'lucide-react';
import { mockUsers } from '../dashboard/page';
import { Separator } from '@/components/ui/separator';

export default function AdminCreatePostPage() {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // Create a flat list of all accounts from all users, with user info attached
  const allAccounts = useMemo(() => {
    return mockUsers.flatMap(user => 
      user.accounts.map(account => ({
        ...account,
        userId: user.id,
        userName: user.name,
      }))
    );
  }, []);

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };
  
  const handleSelectAllAccounts = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedAccountIds(allAccounts.map(acc => acc.id));
    } else {
      setSelectedAccountIds([]);
    }
  };


  const handlePublish = () => {
      setIsPublishing(true);
      console.log({
          accountIds: selectedAccountIds,
          content,
          mediaUrl
      });
      // Simulate API call
      setTimeout(() => {
          setIsPublishing(false);
          alert('Post published! (Check console for data)');
      }, 1500);
  }
  
  const areAllAccountsSelected = allAccounts.length > 0 && selectedAccountIds.length === allAccounts.length;

  return (
    <>
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">Create Post for Users</h1>
        </div>

        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                <div className="sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-3">
                    <Card>
                      <CardHeader>
                        <CardTitle>Post Content</CardTitle>
                        <CardDescription>
                          Write the content and add the media for the post.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="post-content">Content</Label>
                            <Textarea 
                                id="post-content" 
                                placeholder="What's on your mind?" 
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[120px]"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="media-url">Media URL</Label>
                            <Input 
                                id="media-url" 
                                placeholder="https://example.com/image.png" 
                                 value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                            />
                        </div>
                      </CardContent>
                    </Card>
                </div>
                <div className="space-y-4 sm:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Publish</CardTitle>
                            <CardDescription>Publish the post to the selected accounts below.</CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={handlePublish} disabled={isPublishing || selectedAccountIds.length === 0 || !content || !mediaUrl} className="w-full">
                                {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Publish to {selectedAccountIds.length} Account(s)
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
             <Card>
              <CardHeader>
                <CardTitle>Select Accounts</CardTitle>
                <CardDescription>
                  Choose which accounts to post to across all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allAccounts.length > 0 ? (
                    <>
                    <div className="flex items-center space-x-3 rounded-md border p-4 bg-muted/50">
                       <Checkbox
                        id="select-all"
                        checked={areAllAccountsSelected}
                        onCheckedChange={(e) => handleSelectAllAccounts(e as boolean)}
                      />
                       <Label
                        htmlFor="select-all"
                        className="font-semibold"
                      >
                        Select All Accounts ({allAccounts.length})
                      </Label>
                    </div>
                    <Separator />
                    <div className="max-h-[400px] overflow-y-auto pr-2 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {allAccounts.map((account) => (
                            <div
                            key={account.id}
                            className="flex items-center space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors"
                            >
                            <Checkbox
                                id={account.id}
                                checked={selectedAccountIds.includes(account.id)}
                                onCheckedChange={() => handleAccountToggle(account.id)}
                            />
                            <Label
                                htmlFor={account.id}
                                className="flex flex-col gap-0.5"
                            >
                                <span className="font-semibold">{account.name}</span>
                                <span className="text-xs text-muted-foreground">
                                {account.platform} &bull; {account.userName}
                                </span>
                            </Label>
                            </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    There are no social accounts connected to any user.
                  </p>
                )}
              </CardContent>
            </Card>
        </div>
    </>
  );
}
