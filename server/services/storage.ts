import sharp from 'sharp';
import https from 'https';
import crypto from 'crypto';
import { Client } from '@replit/object-storage';

// Initialize Object Storage client
const storage = new Client();
const BUCKET_ID = "replit-objstore-61e062ce-7b37-4380-ac44-c49bccd2f1ff";

interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export class StorageService {
  private static generateUniqueFilename(originalUrl: string): string {
    const hash = crypto.createHash('md5').update(originalUrl).digest('hex');
    return `${hash}.webp`;
  }

  private static async downloadImage(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }).on('error', reject);
    });
  }

  static async storeRecipeImage(imageUrl: string): Promise<{
    storedUrl: string;
    metadata: ImageMetadata;
  }> {
    try {
      console.log('Downloading image from:', imageUrl);
      // Download the image
      const imageBuffer = await this.downloadImage(imageUrl);

      // Generate a unique filename
      const filename = this.generateUniqueFilename(imageUrl);

      // Process and optimize the image
      const processedImage = await sharp(imageBuffer)
        .webp({ quality: 80 }) // Convert to WebP format with good quality/size balance
        .resize(1024, 1024, { // Standardize size while maintaining aspect ratio
          fit: 'inside',
          withoutEnlargement: true
        });

      // Get image metadata
      const metadata = await processedImage.metadata();

      // Get the processed buffer
      const processedBuffer = await processedImage.toBuffer();

      // Upload to object storage
      const key = `recipes/${filename}`;
      await storage.put(key, processedBuffer);

      // Generate the public URL
      const storedUrl = `/api/images/${filename}`;

      return {
        storedUrl,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'webp',
          size: metadata.size || 0
        }
      };
    } catch (error) {
      console.error('Error storing recipe image:', error);
      throw new Error('Failed to store recipe image');
    }
  }

  static async deleteRecipeImage(filename: string): Promise<void> {
    try {
      const key = `recipes/${filename}`;
      await storage.delete(key);
    } catch (error) {
      console.error('Error deleting recipe image:', error);
      throw new Error('Failed to delete recipe image');
    }
  }

  static async getRecipeImage(filename: string): Promise<Buffer | null> {
    try {
      const key = `recipes/${filename}`;
      const object = await storage.get(key);
      if (!object) return null;

      // Convert the object data to Buffer
      return Buffer.from(await object.arrayBuffer());
    } catch (error) {
      console.error('Error retrieving recipe image:', error);
      return null;
    }
  }
}