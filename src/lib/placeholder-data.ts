
import type { Post, AnalyticsData } from './types';
// This file now mainly provides data for charts and placeholder images.
// Account and Post data will be fetched from Firestore.

export const analyticsData: AnalyticsData[] = [
  { date: 'Jan', followers: 2000, engagement: 1.5 },
  { date: 'Feb', followers: 2500, engagement: 1.8 },
  { date: 'Mar', followers: 3200, engagement: 2.1 },
  { date: 'Apr', followers: 4100, engagement: 2.5 },
  { date: 'May', followers: 5200, engagement: 2.3 },
  { date: 'Jun', followers: 6100, engagement: 2.8 },
  { date: 'Jul', followers: 7500, engagement: 3.0 },
];
