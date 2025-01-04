import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import https from 'https';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'recipes');
const PUBLIC_PATH = '/api/images';

// Ensure storage directory exists
fs.ensureDirSync(STORAGE_DIR);

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
      const filePath = path.join(STORAGE_DIR, filename);

      // Process and optimize the image
      const processedImage = await sharp(imageBuffer)
        .webp({ quality: 80 }) // Convert to WebP format with good quality/size balance
        .resize(1024, 1024, { // Standardize size while maintaining aspect ratio
          fit: 'inside',
          withoutEnlargement: true
        });

      // Get image metadata
      const metadata = await processedImage.metadata();

      // Save the processed image
      await processedImage.toFile(filePath);
      console.log('Image saved to:', filePath);

      return {
        storedUrl: `${PUBLIC_PATH}/${filename}`,
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
      const filePath = path.join(STORAGE_DIR, filename);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    } catch (error) {
      console.error('Error deleting recipe image:', error);
      throw new Error('Failed to delete recipe image');
    }
  }

  static async getRecipeImage(filename: string): Promise<Buffer | null> {
    try {
      const filePath = path.join(STORAGE_DIR, filename);
      if (await fs.pathExists(filePath)) {
        return await fs.readFile(filePath);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving recipe image:', error);
      return null;
    }
  }
}