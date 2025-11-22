import fetch from 'node-fetch';
import { Response } from 'node-fetch';
import { uploadImage } from './cloudinary';

export async function downloadAndStoreImage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    const isDataUrl = imageUrl.startsWith('data:');
    
    if (isDataUrl) {
      console.log('Processing base64 data URL for recipe:', recipeId);
    } else {
      console.log('Starting image download for recipe:', recipeId, 'from URL:', imageUrl.substring(0, 100));
      
      const response: Response = await fetch(imageUrl);
      if (!response.ok) {
        console.error('Failed to download image:', response.status, response.statusText);
        throw new Error('Failed to download image');
      }
      
      console.log('Successfully downloaded image for recipe:', recipeId);
    }
    
    const cdnUrl = await uploadImage(imageUrl, recipeId);
    console.log('Successfully uploaded to Cloudinary:', cdnUrl);
    
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
