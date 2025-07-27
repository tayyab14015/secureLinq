import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getRecordingByRecordingId } from '../../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('recordingId');
    const fileName = searchParams.get('fileName');

    if (!recordingId && !fileName) {
      return NextResponse.json({ 
        error: 'Either recordingId or fileName is required' 
      }, { status: 400 });
    }

    let s3Key: string;

    if (recordingId) {
      // Get recording from database
      const recording = await getRecordingByRecordingId(recordingId);
      if (!recording) {
        return NextResponse.json({ 
          error: 'Recording not found' 
        }, { status: 404 });
      }

      if (!recording.s3Key) {
        return NextResponse.json({ 
          error: 'Recording file not available yet' 
        }, { status: 404 });
      }

      s3Key = recording.s3Key;
    } else {
      // Use provided fileName as s3Key
      s3Key = fileName!;
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });

    // Generate signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log(`Generated signed URL for recording: ${s3Key}`);

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrl,
      fileName: s3Key,
      expiresIn: '1 hour',
      message: 'Signed download URL generated successfully'
    });

  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate download URL' 
    }, { status: 500 });
  }
} 