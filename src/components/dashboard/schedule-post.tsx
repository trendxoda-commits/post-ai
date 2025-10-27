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
import { PlusCircle, Calendar, Clock } from 'lucide-react';
import { accounts } from '@/lib/placeholder-data';
import { useToast } from '@/hooks/use-toast';

export function SchedulePost() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSchedule = () => {
    // In a real app, logic to schedule the post would go here.
    toast({
      title: 'Post Scheduled!',
      description: 'Your post has been successfully scheduled for publishing.',
    });
    setOpen(false);
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
            Craft your message and schedule it to be published on your selected
            accounts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="What's on your mind?"
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Accounts</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select accounts to post to" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.username} ({account.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Schedule Date</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Pick a date
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Schedule Time</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <Clock className="mr-2 h-4 w-4" />
                Pick a time
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSchedule}>Schedule Post</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
