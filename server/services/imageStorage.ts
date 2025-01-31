
import { Client } from '@replit/object-storage';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

const storage = new Client();

export async function downloadAndStoreImage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    // Download image from OpenAI
    const response: Response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to download image');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `recipes/${recipeId}.jpg`;
    
    // Upload to Replit Object Storage
    await storage.uploadBuffer(fileName, buffer, {
      contentType: 'image/jpeg',
      public: true // Make the file publicly accessible
    });
    
    // Get permanent URL that doesn't expire
    const permanentUrl = await storage.getSignedUrl(fileName, Date.now() + 365 * 24 * 60 * 60 * 1000);
    return permanentUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    throw error;
  }
}
