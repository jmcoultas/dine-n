import { Files } from "@replit/object-storage";
import crypto from "crypto";

if (!process.env.OBJECT_STORAGE_BUCKET_NAME) {
  throw new Error("Object storage bucket name is not configured");
}

const storage = new Files();

/**
 * Downloads an image from a URL and stores it in object storage
 * @param imageUrl The URL of the image to download
 * @returns The URL of the stored image
 */
export async function storeImageFromUrl(imageUrl: string): Promise<string> {
  try {
    // Generate a unique filename using timestamp and random string
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const fileExtension = 'png';  // DALL-E images are always PNG
    const filename = `recipe-images/${timestamp}-${random}.${fileExtension}`;

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Get the image data as a buffer
    const imageData = await response.arrayBuffer();

    // Store the image in the bucket
    await storage.writeFile(
      `${process.env.OBJECT_STORAGE_BUCKET_NAME}/${filename}`, 
      Buffer.from(imageData),
      {
        contentType: 'image/png',
      }
    );

    // Get the public URL for the stored image
    const publicUrl = storage.getPublicUrl(`${process.env.OBJECT_STORAGE_BUCKET_NAME}/${filename}`);
    return publicUrl;

  } catch (error) {
    console.error('Error storing image:', error);
    throw new Error('Failed to store image in object storage');
  }
}