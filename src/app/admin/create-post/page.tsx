
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { mockUsers } from '../dashboard/page';

export default function AdminCreatePostPage() {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const selectedUser = mockUsers.find((user) => user.id === selectedUserId);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedAccountIds([]); // Reset selected accounts when user changes
  };

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    );
  };
  
  const handlePublish = () => {
      setIsPublishing(true);
      console.log({
          userId: selectedUserId,
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Create Post for User</h2>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>1. Select User</CardTitle>
            <CardDescription>
              Choose the user you want to create a post for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleUserChange} value={selectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedUser && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>2. Select Accounts</CardTitle>
                <CardDescription>
                  Choose which of {selectedUser.name}'s accounts to post to.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedUser.accounts.length > 0 ? (
                  selectedUser.accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center space-x-3 rounded-md border p-4"
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
                          {account.platform}
                        </span>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This user has no social accounts connected.
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>3. Craft Post</CardTitle>
                    <CardDescription>Write the content and add the media for the post.</CardDescription>
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
                <CardFooter>
                    <Button onClick={handlePublish} disabled={isPublishing || selectedAccountIds.length === 0 || !content || !mediaUrl}>
                        {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Publish Post
                    </Button>
                </CardFooter>
            </Card>

          </>
        )}
      </div>
    </div>
  );
}
