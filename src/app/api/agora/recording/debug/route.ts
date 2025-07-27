import { NextResponse } from 'next/server';
import { AgoraRecordingService } from '../../../../../../lib/agoraRecordingService';

export async function POST() {
  try {
    console.log('[Agora Debug] Starting comprehensive Agora setup check...');
    
    const issues: string[] = [];
    const warnings: string[] = [];
    const info: Record<string, unknown> = {};
    
    // 1. Check Agora credentials
    try {
      const appId = process.env.AGORA_APP_ID;
      const encodedKey = process.env.Encoded_Key;
      
      info.agoraCredentials = {
        appId: appId ? `✓ Set (${appId.substring(0, 8)}...)` : '✗ Missing',
        encodedKey: encodedKey ? `✓ Set (${encodedKey.substring(0, 10)}...)` : '✗ Missing'
      };
      
      if (!appId) issues.push('AGORA_APP_ID environment variable is missing');
      if (!encodedKey) issues.push('Encoded_Key environment variable is missing');
      
      // Test Agora auth
      if (appId && encodedKey) {
        AgoraRecordingService.getAuthHeader();
        info.agoraAuth = '✓ Authorization header generated successfully';
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`Agora credentials error: ${errorMessage}`);
    }
    
    // 2. Check AWS S3 configuration
    try {
      const s3Config = AgoraRecordingService.getS3Config();
      info.s3Configuration = {
        vendor: s3Config.vendor === 2 ? '✓ AWS S3 (correct)' : `✗ Wrong vendor: ${s3Config.vendor}`,
        region: s3Config.region > 0 ? `✓ Set (${s3Config.region})` : '✗ Missing or invalid',
        bucket: s3Config.bucket ? '✓ Set' : '✗ Missing',
        accessKey: s3Config.accessKey ? '✓ Set' : '✗ Missing',
        secretKey: s3Config.secretKey ? '✓ Set' : '✗ Missing'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push(`S3 configuration error: ${errorMessage}`);
    }
    
    // 3. Check common recording issues
    const commonIssues = [
      {
        check: 'Channel Name Format',
        status: '⚠️ Important',
        info: 'Channel names should be alphanumeric and not exceed 64 characters'
      },
      {
        check: 'UID Format', 
        status: '⚠️ Important',
        info: 'UID should be a 32-bit unsigned integer or string'
      },
      {
        check: 'Token Validity',
        status: '⚠️ Critical',
        info: 'Recording token must be valid and have sufficient privileges'
      },
      {
        check: 'Users in Channel',
        status: '⚠️ Critical', 
        info: 'Recording only works when there are active users in the channel'
      },
      {
        check: 'Stream Types',
        status: '✓ Configured',
        info: 'streamTypes: 2 (audio + video) is configured'
      },
      {
        check: 'Max Idle Time',
        status: '✓ Configured',
        info: 'maxIdleTime: 30 seconds - recording stops if no users for 30s'
      }
    ];
    
    info.recordingChecklist = commonIssues;
    
    // 4. Environment variables summary
    const envVars = {
      'AGORA_APP_ID': process.env.AGORA_APP_ID ? 'Set' : 'Missing',
      'Encoded_Key': process.env.Encoded_Key ? 'Set' : 'Missing',
      'AWS_S3_BUCKET_NAME': process.env.AWS_S3_BUCKET_NAME ? 'Set' : 'Missing',
      'AWS_ACCESS_KEY_ID': process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Missing',
      'AWS_SECRET_ACCESS_KEY': process.env.AWS_SECRET_ACCESS_KEY ? 'Set' : 'Missing',
      'AWS_REGION': process.env.AWS_REGION ? 'Set' : 'Missing',
      'AWS_REGION_ID': process.env.AWS_REGION_ID ? 'Set' : 'Missing'
    };
    
    info.environmentVariables = envVars;
    
    // 5. Region mapping check
    const regionMappings = {
      'us-east-1': 0,
      'us-east-2': 0,
      'us-west-1': 0,
      'us-west-2': 0,
      'eu-west-1': 1,
      'eu-central-1': 1,
      'ap-southeast-1': 2,
      'ap-northeast-1': 2,
      'ap-south-1': 2
    };
    
    const awsRegion = process.env.AWS_REGION;
    const regionId = parseInt(process.env.AWS_REGION_ID || '21');
    
    if (awsRegion && regionMappings[awsRegion as keyof typeof regionMappings] !== undefined) {
      const expectedRegionId = regionMappings[awsRegion as keyof typeof regionMappings];
      if (regionId !== expectedRegionId) {
        warnings.push(`AWS_REGION_ID (${regionId}) might not match AWS_REGION (${awsRegion}). Expected: ${expectedRegionId}`);
      }
    }
    
    info.regionMapping = {
      awsRegion: awsRegion || 'Not set',
      regionId: regionId,
      expectedMapping: awsRegion ? regionMappings[awsRegion as keyof typeof regionMappings] : 'Unknown'
    };
    
    // 6. Recommendations
    const recommendations = [
      'Test S3 access using /api/agora/recording/test-s3',
      'Ensure your Agora project has Cloud Recording enabled',
      'Verify that users are actually joining the channel before starting recording',
      'Check Agora Console for any failed recording attempts',
      'Monitor server logs for detailed error messages during recording'
    ];
    
    return NextResponse.json({
      success: issues.length === 0,
      summary: {
        issues: issues.length,
        warnings: warnings.length,
        status: issues.length === 0 ? 'Configuration looks good' : 'Issues found that need attention'
      },
      issues,
      warnings,
      info,
      recommendations,
      nextSteps: issues.length === 0 ? [
        'Test S3 configuration',
        'Start a recording with active users in channel',
        'Monitor logs for any upload issues'
      ] : [
        'Fix the issues listed above',
        'Re-run this debug check',
        'Test S3 configuration'
      ]
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Agora Debug] Debug check failed:', errorMessage);
    return NextResponse.json({
      success: false,
      error: 'Debug check failed',
      details: errorMessage
    }, { status: 500 });
  }
} 