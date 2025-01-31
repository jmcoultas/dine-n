
import { Client } from '@replit/object-storage';
import axios from 'axios';

const client = new Client();

export async function downloadAndStoreImage(imageUrl: string, recipeId: string): Promise<string | null> {
  try {
    // Download image
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    
    // Generate a unique filename
    const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `recipe-${recipeId}-${Date.now()}.${fileExtension}`;
    
    // Upload to Replit Object Storage
    await client.upload(fileName, buffer);
    
    // Get permanent URL
    const permanentUrl = await client.getUrl(fileName);
    return permanentUrl;
  } catch (error) {
    console.error('Error storing image:', error);
    return null;
  }
}
