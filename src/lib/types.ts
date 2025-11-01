
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


export type AnalyticsData = {
  date: string;
  followers: number;
  engagement: number;
};
