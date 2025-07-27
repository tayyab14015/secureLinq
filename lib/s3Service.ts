import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// S3Service for handling load media operations
export interface S3MediaObject {
  key: string;
  type: string;
  step?: number;
  lastModified: string;
  fileName: string;
  size: number;
  loadNumber: string;
  signedUrl: string;
}

export interface S3ServiceResponse {
  success: boolean;
  media?: S3MediaObject[];
  error?: string;
}

export class S3Service {
  private static bucketName = process.env.AWS_S3_BUCKET_NAME || '';
  private static region = process.env.AWS_REGION || 'us-east-1';

  private static getS3Client() {
    return new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  /**
   * List all media files for a specific load from S3
   * Structure: loads/LOAD001/timestamp-step1-photo.jpg
   */
  static async listLoadMedia(loadNumber: string): Promise<S3ServiceResponse> {
    try {
      if (!this.bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
      }
      const s3Client = this.getS3Client();
      const prefix = `loads/${loadNumber}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const data = await s3Client.send(command);
      
      const media: S3MediaObject[] = [];
      
      if (data.Contents) {
        for (const object of data.Contents) {
          if (!object.Key || !object.LastModified) continue;
          
          const fileName = object.Key.split('/').pop() || '';
          
          // Skip if it's just the folder path
          if (fileName === '') continue;
          
          // Parse filename to extract step and type
          // Expected format: timestamp-step1-photo.jpg or timestamp-step2-video.mp4
          const fileNameParts = fileName.split('-');
          let step: number | undefined;
          let type = 'unknown';
          
          // Try to extract step number
          for (const part of fileNameParts) {
            if (part.startsWith('step')) {
              const stepMatch = part.match(/step(\d+)/);
              if (stepMatch) {
                step = parseInt(stepMatch[1]);
              }
              break;
            }
          }
          
          // Determine type based on file extension and filename
          const extension = fileName.split('.').pop()?.toLowerCase() || '';
          if (fileName.includes('photo') || fileName.includes('image') || 
              ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            type = 'image';
          } else if (fileName.includes('video') || 
                    ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
            type = 'video';
          }
          
          // Generate signed URL (valid for 1 hour)
          const getObjectCommand = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: object.Key,
          });
          
          const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { 
            expiresIn: 3600 // 1 hour
          });

          media.push({
            key: object.Key,
            type,
            step,
            lastModified: object.LastModified.toISOString(),
            fileName,
            size: object.Size || 0,
            loadNumber,
            signedUrl
          });
        }
      }

      return {
        success: true,
        media
      };

    } catch (error) {
      console.error('Error fetching load media from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Transform S3 media objects to match the expected format for the frontend
   */
  static transformMediaForFrontend(s3Media: S3MediaObject[]) {
    return s3Media.map(media => ({
      id: media.key, // Use S3 key as unique ID
      type: media.type,
      step: media.step,
      timestamp: media.lastModified,
      fileName: media.fileName,
      size: media.size,
      loadNumber: media.loadNumber,
      signedUrl: media.signedUrl,
      s3Key: media.key,
      uri: media.signedUrl, // For compatibility with existing video player code
    }));
  }
} 