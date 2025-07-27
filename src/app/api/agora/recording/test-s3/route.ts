import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

export async function POST() {
  try {
    console.log('[S3 Test] Starting S3 configuration test...');
    
    // Check environment variables
    const requiredEnvVars = {
      AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION
    };
    
    // AWS_REGION_ID is optional and defaults to 0 for US regions
    const AWS_REGION_ID = process.env.AWS_REGION_ID || '0';
    
    console.log('[S3 Test] Environment variables check:', {
      AWS_S3_BUCKET_NAME: requiredEnvVars.AWS_S3_BUCKET_NAME ? '✓ Set' : '✗ Missing',
      AWS_ACCESS_KEY_ID: requiredEnvVars.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing',
      AWS_SECRET_ACCESS_KEY: requiredEnvVars.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing',
      AWS_REGION: requiredEnvVars.AWS_REGION ? '✓ Set' : '✗ Missing',
      AWS_REGION_ID: AWS_REGION_ID ? `✓ Set (${AWS_REGION_ID})` : '✗ Missing'
    });
    
    const missingVars = Object.entries(requiredEnvVars)
      .filter(([, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        missing: missingVars,
        help: 'Please check your .env.local file and ensure all AWS S3 credentials are set'
      }, { status: 400 });
    }
    
    // Test S3 connection
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
    
    console.log('[S3 Test] Testing S3 connection...');
    
    try {
      // Test 1: List objects in bucket (read permission)
      const listCommand = new ListObjectsV2Command({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        MaxKeys: 5
      });
      
      const listResult = await s3Client.send(listCommand);
      console.log('[S3 Test] Bucket listing successful. Objects found:', listResult.KeyCount || 0);
      
      // Test 2: Upload a test file (write permission)
      const testFileName = `agora-test-${Date.now()}.txt`;
      const putCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: testFileName,
        Body: 'Agora Cloud Recording S3 test file',
        ContentType: 'text/plain'
      });
      
      await s3Client.send(putCommand);
      console.log('[S3 Test] Test file upload successful:', testFileName);
      
      const testUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${testFileName}`;
      
      return NextResponse.json({
        success: true,
        message: 'S3 configuration is working correctly',
        details: {
          bucketAccess: '✓ Can list objects',
          uploadAccess: '✓ Can upload files',
          testFile: testFileName,
          testUrl: testUrl,
          existingObjects: listResult.KeyCount || 0
        },
        agoraConfig: {
          vendor: 2,
          region: parseInt(AWS_REGION_ID),
          bucket: process.env.AWS_S3_BUCKET_NAME,
          regionId: AWS_REGION_ID,
          awsRegion: process.env.AWS_REGION
        }
      });
      
    } catch (s3Error: unknown) {
      console.error('[S3 Test] S3 operation failed:', s3Error);
      const s3ErrorMessage = s3Error instanceof Error ? s3Error.message : 'Unknown S3 error';
      
      return NextResponse.json({
        success: false,
        error: 'S3 operation failed',
        details: s3ErrorMessage,
        help: 'Check your AWS credentials and bucket permissions. Ensure the bucket exists and your credentials have read/write access.',
        possibleIssues: [
          'Invalid AWS credentials',
          'Bucket does not exist',
          'Insufficient permissions (need s3:GetObject, s3:PutObject, s3:ListBucket)',
          'Incorrect region configuration',
          'Bucket policy restrictions'
        ]
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('[S3 Test] Test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'S3 test failed',
      details: errorMessage
    }, { status: 500 });
  }
} 