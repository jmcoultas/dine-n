import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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