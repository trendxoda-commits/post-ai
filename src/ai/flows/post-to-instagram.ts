'use server';

/**
 * @fileOverview Instagram Post Flow
 * This file contains a Genkit flow for posting an image or video to Instagram.
 * It handles indirect URLs by downloading the media, hosting it temporarily on Gofile,
 * and then using the direct Gofile URL to post to Instagram.
 * - postToInstagram - Posts media to a user's Instagram account.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import axios from 'axios';
import FormData from 'form-data';
import { randomBytes } from 'crypto';


const PostToInstagramInputSchema = z.object({
  instagramUserId: z.string().describe('The Instagram User ID.'),
  mediaUrl: z.string().describe('The public URL of the image or video to post.'),
  caption: z.string().optional().describe('The caption for the post.'),
  pageAccessToken: z.string().describe('The Page Access Token with instagram_content_publish permission.'),
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
});
export type PostToInstagramInput = z.infer<typeof PostToInstagramInputSchema>;

const PostToInstagramOutputSchema = z.object({
  postId: z.string().describe('The ID of the created Instagram post.'),
});
export type PostToInstagramOutput = z.infer<typeof PostToInstagramOutputSchema>;

const INSTAGRAM_GRAPH_API_URL = 'https://graph.facebook.com/v20.0';

// Helper function to delay execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Downloads media from a URL, uploads it to Gofile.io, and returns a direct link.
 * This is necessary because Instagram requires a direct, public URL, and cannot handle
 * redirects from services like Pexels.
 * @param url The indirect URL of the media to download.
 * @returns A direct, public URL to the media hosted on Gofile.
 */
async function getDirectMediaUrl(url: string): Promise<string> {
    try {
        console.log(`Downloading media from: ${url}`);
        // Download the media file as a buffer
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            maxRedirects: 5, // Follow redirects
        });
        const mediaBuffer = Buffer.from(response.data);
        const fileName = `upload-${randomBytes(8).toString('hex')}.${url.includes('video') ? 'mp4' : 'jpg'}`;

        console.log("Uploading media to temporary host (Gofile)...");

        // 1. Get the best server from Gofile
        const serverResponse = await fetch('https://api.gofile.io/getServer');
        if (!serverResponse.ok) {
            throw new Error('Could not get a Gofile server.');
        }
        const serverData = await serverResponse.json();
        if (serverData.status !== 'ok') {
            throw new Error('Failed to get a Gofile server, status was not "ok".');
        }
        const server = serverData.data.server;

        // 2. Upload the file
        const formData = new FormData();
        formData.append('file', mediaBuffer, fileName);
        
        const uploadResponse = await fetch(`https://${server}.gofile.io/uploadFile`, {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders(),
        });

        if (!uploadResponse.ok) {
             const errorText = await uploadResponse.text();
             throw new Error(`Gofile upload failed: ${errorText}`);
        }

        const uploadData = await uploadResponse.json();
        if (uploadData.status !== 'ok') {
             throw new Error(`Gofile upload failed after request. Status: ${uploadData.status}`);
        }
        
        const directLink = uploadData.data.downloadPage.replace('/d/', '/'); // Create a more direct-like link if possible
        console.log(`Media hosted successfully. Direct link: ${directLink}`);
        // Return the direct download link provided by Gofile
        return uploadData.data.directLink || directLink;

    } catch (error: any) {
        console.error("Failed during getDirectMediaUrl:", error.message, error.stack);
        throw new Error(`Failed to download or re-host the media file. The provided URL might be invalid or private. Original error: ${error.message}`);
    }
}


const postToInstagramFlow = ai.defineFlow(
  {
    name: 'postToInstagramFlow',
    inputSchema: PostToInstagramInputSchema,
    outputSchema: PostToInstagramOutputSchema,
  },
  async ({ instagramUserId, mediaUrl, caption, pageAccessToken, mediaType }) => {
    if (!pageAccessToken) {
      throw new Error('Instagram Page Access Token is required.');
    }

    let finalMediaUrl = mediaUrl;
    
    // Instagram needs a direct URL. If the URL doesn't end with a common media extension,
    // or if it's from a known indirect source like pexels, we re-host it to get a direct link.
    const isDirectUrl = /\.(jpg|jpeg|png|gif|mp4|mov|avi)$/i.test(mediaUrl);
    const isPexels = mediaUrl.includes('pexels.com');

    if (!isDirectUrl || isPexels) {
         console.log("Indirect URL detected. Re-hosting to get a direct link for Instagram.");
         finalMediaUrl = await getDirectMediaUrl(mediaUrl);
    } else {
        console.log("Direct URL detected. Posting directly to Instagram.");
    }
    
    // Step 1: Create a media container.
    const containerUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media`;
    
    const isVideo = mediaType === 'VIDEO';
    
    let params = new URLSearchParams({
        access_token: pageAccessToken,
    });

    if (isVideo) {
        params.append('media_type', 'VIDEO');
        params.append('video_url', finalMediaUrl);
    } else {
        params.append('image_url', finalMediaUrl);
    }

    if (caption) {
        params.append('caption', caption);
    }


    const containerResponse = await fetch(`${containerUrl}?${params.toString()}`, {
        method: 'POST',
    });

    if (!containerResponse.ok) {
        const errorData: any = await containerResponse.json();
        console.error('Failed to create Instagram media container:', errorData);
        const errorMessage = errorData.error?.error_subcode === 2207027 
            ? 'The video format is not supported. Please use a different video.'
            : errorData.error?.message || 'Unknown error during container creation.';
        throw new Error(`Failed to create Instagram media container: ${errorMessage}`);
    }

    const containerData: any = await containerResponse.json();
    const creationId = containerData.id;

    if (!creationId) {
      throw new Error('Failed to get creation ID from Instagram.');
    }

    // For images, publishing is immediate.
    // For videos, we must wait for it to finish processing.
    if (!isVideo) {
        return publishContainer(instagramUserId, creationId, pageAccessToken);
    } else {
        return await pollAndPublishContainer(instagramUserId, creationId, pageAccessToken);
    }
  }
);


async function pollAndPublishContainer(instagramUserId: string, creationId: string, pageAccessToken: string): Promise<PostToInstagramOutput> {
    const maxRetries = 20; // 20 * 5s = 100 seconds timeout
    const pollInterval = 5000; // 5 seconds

    for (let i = 0; i < maxRetries; i++) {
        const statusUrl = `${INSTAGRAM_GRAPH_API_URL}/${creationId}?fields=status_code&access_token=${pageAccessToken}`;
        const statusResponse = await fetch(statusUrl);

        if (!statusResponse.ok) {
            throw new Error('Failed to poll container status.');
        }

        const statusData: any = await statusResponse.json();
        const statusCode = statusData.status_code;
        
        console.log(`Polling container ${creationId}, status: ${statusCode}`);

        if (statusCode === 'FINISHED') {
            return publishContainer(instagramUserId, creationId, pageAccessToken);
        }

        if (statusCode === 'ERROR') {
             console.error('Container processing failed:', statusData);
             throw new Error('The uploaded video failed to process. It might be corrupted or in an unsupported format.');
        }

        // Wait before polling again
        await sleep(pollInterval);
    }
    
    throw new Error('Video processing timed out. Please try again later.');
}


async function publishContainer(instagramUserId: string, creationId: string, pageAccessToken: string): Promise<PostToInstagramOutput> {
    const publishUrl = `${INSTAGRAM_GRAPH_API_URL}/${instagramUserId}/media_publish`;
    
    const params = new URLSearchParams({
        creation_id: creationId,
        access_token: pageAccessToken,
    });

    console.log(`Publishing container ${creationId}...`);
    const publishResponse = await fetch(`${publishUrl}?${params.toString()}`, {
        method: 'POST',
    });

    if (!publishResponse.ok) {
        const errorData: any = await publishResponse.json();
        console.error('Failed to publish Instagram media container:', errorData);
        throw new Error(`Failed to publish Instagram media: ${errorData.error?.message || 'Unknown error'}`);
    }

    const publishData: any = await publishResponse.json();
    const postId = publishData.id;

    if (!postId) {
        throw new Error('Failed to get post ID from Instagram after publishing.');
    }
    console.log(`Successfully published Instagram post: ${postId}`);
    return { postId };
}


export async function postToInstagram(input: PostToInstagramInput): Promise<PostToInstagramOutput> {
    return postToInstagramFlow(input);
}