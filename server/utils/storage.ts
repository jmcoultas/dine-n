import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

// Configure Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary credentials:", {
    cloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: !!process.env.CLOUDINARY_API_KEY,
    apiSecret: !!process.env.CLOUDINARY_API_SECRET
  });
  throw new Error("Cloudinary configuration is incomplete. Please ensure all required environment variables are set.");
}

console.log("Configuring Cloudinary with cloud name:", process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Downloads an image from a URL and stores it in Cloudinary
 * @param imageUrl The URL of the image to download
 * @returns The URL of the stored image
 */
export async function storeImageFromUrl(imageUrl: string): Promise<string> {
  try {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    // Generate a unique identifier for the image
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const publicId = `recipe-images/${timestamp}-${random}`;

    console.log("Attempting to upload image to Cloudinary:", {
      publicId,
      imageUrl: imageUrl.substring(0, 50) + '...' // Log truncated URL for privacy
    });

    // Upload the image to Cloudinary directly from the URL
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      folder: 'recipe-images',
      resource_type: 'image',
      format: 'png',  // DALL-E images are always PNG
      transformation: [
        { quality: 'auto:good' }, // Optimize image quality
        { fetch_format: 'auto' }  // Serve in the best format for the client
      ]
    });

    console.log("Successfully uploaded image to Cloudinary:", {
      publicId,
      secureUrl: result.secure_url
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error storing image in Cloudinary:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to store image in Cloudinary: ${error.message}`);
    }
    throw new Error('Failed to store image in Cloudinary');
  }
}