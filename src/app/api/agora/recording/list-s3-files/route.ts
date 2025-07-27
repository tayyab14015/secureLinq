import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      MaxKeys: 100 // Get up to 100 files
    });

    const result = await s3Client.send(listCommand);

    const files = result.Contents?.map(obj => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
      isRecording: obj.Key?.includes('.mp4') || obj.Key?.includes('.m3u8')
    })) || [];

    // Separate recording files from other files
    const recordingFiles = files.filter(f => f.isRecording);
    const otherFiles = files.filter(f => !f.isRecording);

    return NextResponse.json({
      success: true,
      totalFiles: files.length,
      recordingFiles: recordingFiles.length,
      files: {
        recordings: recordingFiles,
        others: otherFiles.slice(0, 10) // Show first 10 other files
      }
    });

  } catch (error: unknown) {
    console.error('Error listing S3 files:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to list S3 files',
      details: errorMessage
    }, { status: 500 });
  }
} 