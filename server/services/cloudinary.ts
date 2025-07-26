import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/environment';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret
});

export async function uploadImage(imageUrl: string, recipeId: string): Promise<string> {
  try {
    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'recipes',
      public_id: recipeId,
      transformation: [
        { width: 1024, height: 1024, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    // Return the secure URL
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
} 