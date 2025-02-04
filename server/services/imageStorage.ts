import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import { uploadImage } from './cloudinary';

export async function downloadAndStoreImage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    console.log('Starting image download for recipe:', recipeId, 'from URL:', imageUrl);
    
    // Download image from OpenAI or other source
    const response: Response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('Failed to download image:', response.status, response.statusText);
      throw new Error('Failed to download image');
    }
    
    console.log('Successfully downloaded image for recipe:', recipeId);
    
    // Upload to Cloudinary and get CDN URL
    const cdnUrl = await uploadImage(imageUrl, recipeId);
    console.log('Successfully uploaded to Cloudinary:', cdnUrl);
    
    // Test URL accessibility
    try {
      const testResponse = await fetch(cdnUrl);
      if (!testResponse.ok) {
        console.error('Warning: Generated URL is not accessible:', testResponse.status, testResponse.statusText);
      } else {
        console.log('URL test successful - image is accessible');
      }
    } catch (error) {
      console.error('Warning: Could not verify URL accessibility:', error);
    }
    
    console.log('Successfully stored image with CDN URL:', cdnUrl);
    return cdnUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    throw error;
  }
}
