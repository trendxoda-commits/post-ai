'use server';

import { config } from 'dotenv';
config();

import '@/ai/genkit';
import '@/ai/flows/trending-hashtag-suggestions.ts';
import '@/ai/flows/instagram-auth.ts';
import '@/ai/flows/post-to-facebook.ts';
import '@/ai/flows/post-to-instagram.ts';
import '@/ai/flows/social-media-actions.ts';
import '@/ai/flows/schedule-post-execution.ts';
import '@/ai/flows/admin-actions.ts';
