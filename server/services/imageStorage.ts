
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
    const { ok, error } = await storage.uploadFromBytes(fileName, buffer);

    if (!ok) {
      console.error('Error uploading image:', error);
      // Handle the error appropriately, e.g., throw an error or return a response
    }
    
    // Get permanent URL that doesn't expire
    const permanentUrl = `https://replit-objstore-61e062ce-7b37-4380-ac44-c49bcf2f1ff.replit.dev/${fileName}`; // Construct the URL manually
    return permanentUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    throw error;
  }
}
