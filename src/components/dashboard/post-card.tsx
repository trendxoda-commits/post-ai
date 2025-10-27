import Image from 'next/image';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import type { FeedPost } from './feed';
import Link from 'next/link';

const PlatformIcon = ({ platform }: { platform: 'Instagram' | 'Facebook' }) => {
  if (platform === 'Instagram') {
    return (
      <svg
        className="h-5 w-5 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    );
  }
  return (
    <svg
      className="h-5 w-5 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
    </svg>
  );
};

interface PostCardProps {
  post: FeedPost;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.accountAvatar} alt={post.accountDisplayName} />
            <AvatarFallback>{post.accountDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{post.accountDisplayName}</p>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PlatformIcon platform={post.accountPlatform} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={post.permalink} target="_blank" rel="noopener noreferrer">View Post on {post.accountPlatform}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Analytics</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {post.content && <p className="text-sm">{post.content}</p>}
        {post.mediaUrl && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border">
            {post.mediaType === 'VIDEO' ? (
                <video
                    src={post.mediaUrl}
                    controls
                    className="w-full h-full object-cover"
                >
                    Your browser does not support the video tag.
                </video>
            ) : (
                <Image
                    src={post.mediaUrl}
                    alt="Post content"
                    fill
                    className="object-cover"
                />
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4" />
          <span>{post.likes.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          <span>{post.comments.toLocaleString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
