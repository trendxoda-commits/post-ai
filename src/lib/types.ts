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
};

export type ApiCredential = {
  id: string;
  userId: string;
  platform: 'Meta';
  appId: string;
  appSecret: string;
  accessToken?: string; // Encrypted long-lived user access token
}

export type Post = {
  id: string;
  accountId: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  timestamp: string;
  scheduledTime?: string;
};

export type ScheduledPost = {
  id: string;
  userId: string;
  content: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  scheduledTime: string;
  socialAccountIds: string[];
  createdAt: string;
}

export type AnalyticsData = {
  date: string;
  followers: number;
  engagement: number;
};
