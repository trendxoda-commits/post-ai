'use server';

import {
  getTrendingHashtags,
  type TrendingHashtagsInput,
  type TrendingHashtagsOutput,
} from '@/ai/flows/trending-hashtag-suggestions';

export async function generateHashtags(
  input: TrendingHashtagsInput
): Promise<TrendingHashtagsOutput> {
  // In a real app, you might add validation or user authentication checks here.
  return getTrendingHashtags(input);
}
