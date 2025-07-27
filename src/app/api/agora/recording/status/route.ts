import { NextRequest, NextResponse } from 'next/server';
import { AgoraRecordingService } from '../../../../../../lib/agoraRecordingService';
import { 
  getRecordingByRecordingId,
  updateRecordingFile,
  updateRecordingStatus
} from '../../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json({ 
        error: 'recordingId is required' 
      }, { status: 400 });
    }

    // Get recording details from database
    const recording = await getRecordingByRecordingId(recordingId);
    if (!recording) {
      return NextResponse.json({ 
        error: 'Recording not found' 
      }, { status: 404 });
    }

    // If recording is already completed, return current info
    if (recording.status === 'completed') {
      return NextResponse.json({
        success: true,
        status: 'completed',
        fileName: recording.fileName,
        s3Key: recording.s3Key,
        s3Url: recording.s3Url,
        duration: recording.duration,
        fileSize: recording.fileSize,
        message: 'Recording is already completed'
      });
    }

    // Try to query the recording status from Agora
    try {
      console.log(`Checking recording status for recordingId: ${recordingId}`);
      const queryResult = await AgoraRecordingService.queryRecording(recording.resourceId, recording.sid) as {
        serverResponse?: {
          status?: number;
          fileList?: Array<{
            fileName: string;
            fileSize?: number;
            duration?: number;
          }>;
        };
      };
      console.log('Query result:', JSON.stringify(queryResult, null, 2));

      // Check if we have file information now
      if (queryResult.serverResponse?.fileList && queryResult.serverResponse.fileList.length > 0) {
        const fileInfo = queryResult.serverResponse.fileList[0];
        
        // Update recording with file details
        await updateRecordingFile(
          recordingId,
          fileInfo.fileName,
          fileInfo.fileName, // s3Key is the same as fileName
          `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileInfo.fileName}`,
          fileInfo.duration || 0,
          fileInfo.fileSize || 0
        );

        // Update status to completed
        await updateRecordingStatus(recordingId, 'completed');

        return NextResponse.json({
          success: true,
          status: 'completed',
          fileName: fileInfo.fileName,
          s3Key: fileInfo.fileName,
          s3Url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileInfo.fileName}`,
          duration: fileInfo.duration,
          fileSize: fileInfo.fileSize,
          message: 'Recording file information updated successfully'
        });
      }

      // If no file list yet, return current status
      return NextResponse.json({
        success: true,
        status: recording.status,
        message: 'Recording is still being processed'
      });

    } catch (error) {
      console.error('Error querying recording status:', error);
      
      // If we get a 404 (worker not found), the recording might be completed
      // but we can't query it anymore. In this case, we'll keep the current status.
      return NextResponse.json({
        success: true,
        status: recording.status,
        message: 'Unable to query recording status from Agora'
      });
    }

  } catch (error) {
    console.error('Error checking recording status:', error);
    return NextResponse.json({ 
      error: 'Failed to check recording status' 
    }, { status: 500 });
  }
} 