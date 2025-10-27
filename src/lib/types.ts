export type SocialAccount = {
  id: string;
  userId: string;
  platform: 'Instagram' | 'Facebook';
  accountId: string;
  displayName: string;
  avatar?: string;
};

export type ApiCredential = {
  id: string;
  userId: string;
  platform: 'Instagram' | 'Facebook';
  appId: string;
  appSecret: string;
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
  scheduledTime: string;
  socialAccountIds: string[];
  createdAt: string;
}

export type AnalyticsData = {
  date: string;
  followers: number;
  engagement: number;
};
