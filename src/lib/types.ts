
export type User = {
  id: string;
  email: string;
  createdAt: string;
};

export type SocialAccount = {
  id: string;
  userId: string;
  platform: 'Instagram' | 'Facebook';
  accountId: string;
  displayName: string;
  avatar?: string;
  pageAccessToken?: string;
  followers?: number;
  totalLikes?: number;
  totalComments?: number;
  totalViews?: number;
  postCount?: number;
};

export type ApiCredential = {
  id: string;
  userId: string;
  platform: 'Meta';
  appId: string;
  appSecret: string;
  accessToken?: string; // Encrypted long-lived user access token
}

export type SocialPost = {
  id: string;
  userId: string;
  socialAccountId: string;
  platform: 'Instagram' | 'Facebook';
  postId: string;
  content?: string | null;
  mediaUrl?: string;
  mediaType?: string;
  permalink?: string;
  likes: number;
  comments: number;
  views: number;
  timestamp: string;
  // For UI joins
  account?: {
    displayName: string;
    avatar?: string;
  }
};


export type ScheduledPost = {
  id: string;
  userId: string;
  content: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  scheduledTime: string;
  socialAccountIds: string[];
  createdAt: any; // Can be Timestamp
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  isNow: boolean; // True if it was a "Post Now" job
  // For UI Joins
  accounts?: {
    displayName: string;
    platform: string;
    avatar?: string;
  }[];
};


export type AnalyticsData = {
  date: string;
  followers: number;
  engagement: number;
};
