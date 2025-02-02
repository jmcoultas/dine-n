import { Client } from '@replit/object-storage';
import fetch from 'node-fetch';
import { Response } from 'node-fetch';

const storage = new Client();

// The base URL for the storage bucket
const BUCKET_NAME = process.env.BUCKET_NAME || '61e062ce-7b37-4380-ac44-c49bcf2f1ff';

export async function downloadAndStoreImage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    console.log('Starting image download for recipe:', recipeId, 'from URL:', imageUrl);
    
    // Download image from OpenAI
    const response: Response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to download image:', response.status, response.statusText);
      throw new Error('Failed to download image');
    }
    
    console.log('Successfully downloaded image for recipe:', recipeId);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `recipes/${recipeId}.jpg`;
    
    console.log('Attempting to upload to object storage:', fileName);
    
    // Upload to Replit Object Storage
    const { ok, error } = await storage.uploadFromBytes(fileName, buffer);

    if (!ok) {
      console.error('Failed to upload to object storage:', error);
      throw new Error(`Failed to upload image: ${error}`);
    }
    
    console.log('Successfully uploaded to object storage');
    
    // Construct the permanent URL using the Replit Object Storage domain
    const permanentUrl = `https://${BUCKET_NAME}.replitusercontent.com/${fileName}`;
    
    // Verify the object exists after upload
    console.log('Verifying file exists in storage');
    const { value: exists } = await storage.exists(fileName);
    if (!exists) {
      console.error('File verification failed - file does not exist in storage');
      throw new Error('File upload verification failed');
    }
    
    // Test URL accessibility
    try {
      const testResponse = await fetch(permanentUrl);
      if (!testResponse.ok) {
        console.error('Warning: Generated URL is not accessible:', testResponse.status, testResponse.statusText);
      } else {
        console.log('URL test successful - image is accessible');
      }
    } catch (error) {
      console.error('Warning: Could not verify URL accessibility:', error);
    }
    
    console.log('Successfully stored image with permanent URL:', permanentUrl);
    return permanentUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    throw error;
  }
}
