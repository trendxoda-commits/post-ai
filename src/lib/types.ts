export type Account = {
  id: string;
  platform: 'instagram' | 'facebook';
  username: string;
  avatar: string;
  followers: number;
  engagementRate: number;
};

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

export type AnalyticsData = {
  date: string;
  followers: number;
  engagement: number;
};
