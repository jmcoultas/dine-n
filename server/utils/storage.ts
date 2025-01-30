
import { Client } from '@replit/object-storage';

export async function downloadAndStoreImage(imageUrl: string): Promise<string | null> {
  try {
    // Initialize storage client
    const storage = new Client();
    
    // Download image from URL
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Generate unique filename
    const imageName = `${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    
    // Upload to Object Storage
    const { ok: uploadOk, error: uploadError } = await storage.uploadFromBuffer(
      imageName,
      buffer,
      { contentType: 'image/png' }
    );

    if (!uploadOk) {
      console.error('Failed to upload image:', uploadError);
      return null;
    }

    // Get permanent URL
    const { ok: urlOk, value: url, error: urlError } = await storage.getSignedUrl(imageName);
    if (!urlOk) {
      console.error('Failed to get signed URL:', urlError);
      return null;
    }

    return url;
  } catch (error) {
    console.error('Error in downloadAndStoreImage:', error);
    return null;
  }
}
