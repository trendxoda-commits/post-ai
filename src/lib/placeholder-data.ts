import type { Post, AnalyticsData } from './types';
import { PlaceHolderImages } from './placeholder-images';

const findImage = (id: string) =>
  PlaceHolderImages.find((img) => img.id === id)?.imageUrl || '';

// This file now mainly provides data for charts and placeholder images.
// Account and Post data will be fetched from Firestore.

export const posts: Post[] = [
  {
    id: 'post1',
    accountId: 'acc1',
    content: 'Enjoying the serene beauty of the mountains. #nature #mountains #travel',
    imageUrl: findImage('post1'),
    likes: 1200,
    comments: 45,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post2',
    accountId: 'acc2',
    content: 'Had the most amazing pasta for dinner! 🍝 #food #pasta #italianfood',
    imageUrl: findImage('post2'),
    likes: 350,
    comments: 22,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post3',
    accountId: 'acc3',
    content: 'City lights and late night vibes. ✨ #citylife #nightphotography #skyline',
    imageUrl: findImage('post3'),
    likes: 2500,
    comments: 112,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post4',
    accountId: 'acc1',
    content: 'My furry best friend enjoying the park. 🐶 #dogsofinstagram #petlove',
    imageUrl: findImage('post4'),
    likes: 980,
    comments: 67,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'post5',
    accountId: 'acc3',
    content: 'Playing with colors. What do you see in this?',
    imageUrl: findImage('post5'),
    likes: 1800,
    comments: 95,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];


export const analyticsData: AnalyticsData[] = [
  { date: 'Jan', followers: 2000, engagement: 1.5 },
  { date: 'Feb', followers: 2500, engagement: 1.8 },
  { date: 'Mar', followers: 3200, engagement: 2.1 },
  { date: 'Apr', followers: 4100, engagement: 2.5 },
  { date: 'May', followers: 5200, engagement: 2.3 },
  { date: 'Jun', followers: 6100, engagement: 2.8 },
  { date: 'Jul', followers: 7500, engagement: 3.0 },
];
