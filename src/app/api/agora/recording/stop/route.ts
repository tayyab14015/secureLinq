import { NextRequest, NextResponse } from 'next/server';
import { AgoraRecordingService } from '../../../../../../lib/agoraRecordingService';
import { 
  getRecordingByRecordingId,
  updateRecordingFile,
  updateRecordingStatus
} from '../../../../../../lib/db';

interface StopResponse {
  success: boolean;
  fileName?: string;
  s3Key?: string;
  s3Url?: string;
  duration?: number;
  fileSize?: number;
}

// Helper function to poll for file information
async function pollForFileInfo(recordingId: string, resourceId: string, sid: string, maxAttempts: number = 5) {
  console.log(`Starting background polling for recording ${recordingId}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt}/${maxAttempts} for recording ${recordingId}`);
      
      // Wait before each attempt (except the first)
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds between attempts
      }
      
      // Try to query the recording
      const queryResult = await AgoraRecordingService.queryRecording(resourceId, sid);
      console.log(`Query result for attempt ${attempt}:`, JSON.stringify(queryResult, null, 2));
      
      // Check the recording status
      const queryResponse = queryResult as { serverResponse?: { status?: number; fileList?: Array<{ fileName: string; fileSize?: number; duration?: number }> } };
      const status = queryResponse.serverResponse?.status;
      const fileList = queryResponse.serverResponse?.fileList;
      
      console.log(`Query status: ${status}, fileList length: ${fileList?.length || 0}`);
      
      // Status 6 means recording ended
      if (status === 6) {
        if (fileList && fileList.length > 0) {
          console.log('Available files in query:', fileList.map((f: { fileName: string }) => f.fileName));
          
          // Prefer .mp4 files over .m3u8 files for better compatibility
          let selectedFile = fileList.find((f: { fileName: string }) => f.fileName?.endsWith('.mp4'));
          
          // If no .mp4 file found, use the first available file
          if (!selectedFile) {
            selectedFile = fileList[0];
          }
          
          console.log(`Selected file for storage on attempt ${attempt}:`, selectedFile.fileName);
          console.log(`Found file info on attempt ${attempt}:`, selectedFile);
          
          // Update recording with file details
          await updateRecordingFile(
            recordingId,
            selectedFile.fileName,
            selectedFile.fileName, // s3Key is the same as fileName
            `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${selectedFile.fileName}`,
            selectedFile.duration || 0,
            selectedFile.fileSize || 0
          );
          
          // Update status to completed
          await updateRecordingStatus(recordingId, 'completed');
          
          console.log(`Successfully updated recording ${recordingId} with file info`);
          return {
            success: true,
            fileName: selectedFile.fileName,
            s3Key: selectedFile.fileName,
            s3Url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${selectedFile.fileName}`,
            duration: selectedFile.duration || 0,
            fileSize: selectedFile.fileSize || 0
          };
        } else {
          // Status 6 with no files means recording ended but no content was captured
          console.log(`Recording ${recordingId} ended with status 6 but no files - likely too short or no content`);
          await updateRecordingStatus(recordingId, 'failed');
          console.log(`Updated recording ${recordingId} status to failed - no content captured`);
          return { success: false, message: 'Recording ended with no content captured' };
        }
      }
      
      // Check if we have file information (for other statuses)
      if (fileList && fileList.length > 0) {
        console.log('Available files in query (other status):', fileList.map((f: { fileName: string }) => f.fileName));
        
        // Prefer .mp4 files over .m3u8 files for better compatibility
        let selectedFile = fileList.find((f: { fileName: string }) => f.fileName?.endsWith('.mp4'));
        
        // If no .mp4 file found, use the first available file
        if (!selectedFile) {
          selectedFile = fileList[0];
        }
        
        console.log(`Selected file for storage on attempt ${attempt}:`, selectedFile.fileName);
        console.log(`Found file info on attempt ${attempt}:`, selectedFile);
        
        // Update recording with file details
        await updateRecordingFile(
          recordingId,
          selectedFile.fileName,
          selectedFile.fileName, // s3Key is the same as fileName
          `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${selectedFile.fileName}`,
          selectedFile.duration || 0,
          selectedFile.fileSize || 0
        );
        
        // Update status to completed
        await updateRecordingStatus(recordingId, 'completed');
        
        console.log(`Successfully updated recording ${recordingId} with file info`);
        return {
          success: true,
          fileName: selectedFile.fileName,
          s3Key: selectedFile.fileName,
          s3Url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${selectedFile.fileName}`,
          duration: selectedFile.duration || 0,
          fileSize: selectedFile.fileSize || 0
        };
      }
      
    } catch (error) {
      console.error(`Polling attempt ${attempt} failed for recording ${recordingId}:`, error);
      
      // If we get a 404, it might mean the recording is being processed
      // Continue trying for a few more attempts
      if (attempt === maxAttempts) {
        console.error(`All polling attempts failed for recording ${recordingId}. Setting status to failed.`);
        await updateRecordingStatus(recordingId, 'failed');
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { recordingId } = await request.json();
    
    if (!recordingId) {
      return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 });
    }

    // Get recording details from database
    const recording = await getRecordingByRecordingId(recordingId);
    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    console.log('Stopping recording:', recording);

    // Stop the recording using Agora API
    const stopResponse = await AgoraRecordingService.stopRecording(
      recording.resourceId,
      recording.sid,
      recording.uid,
      recording.cname
    ) as StopResponse;

    if (!stopResponse.success) {
      // Update recording status to failed
      await updateRecordingStatus(recordingId, 'failed');
      return NextResponse.json({ 
        error: stopResponse || 'Failed to stop recording' 
      }, { status: 500 });
    }

    console.log('Recording stopped successfully:', stopResponse);

    // Check if we have file information from the stop response
    if (stopResponse.fileName && stopResponse.s3Url) {
      console.log('File information available immediately');
      
      // Update recording with file details from stop response
      await updateRecordingFile(
        recordingId,
        stopResponse.fileName,
        stopResponse.s3Key || stopResponse.fileName || '',
        stopResponse.s3Url,
        stopResponse.duration || 0,
        stopResponse.fileSize || 0
      );

      // Update recording status to completed
      await updateRecordingStatus(recordingId, 'completed');

      return NextResponse.json({
        success: true,
        fileName: stopResponse.fileName,
        s3Key: stopResponse.s3Key,
        s3Url: stopResponse.s3Url,
        duration: stopResponse.duration,
        fileSize: stopResponse.fileSize,
        message: 'Recording stopped and saved successfully'
      });
    } else {
      console.log('No file information in stop response, starting background polling...');
      
      // Start background polling for file information
      setTimeout(() => {
        pollForFileInfo(recordingId, recording.resourceId, recording.sid)
          .then(async (fileInfo) => {
            console.log('Background polling completed successfully:', fileInfo);
          })
          .catch(() => {
            console.log('Background polling failed, but recording was stopped');
          });
      }, 1000);

      // Update recording status to recording (will be updated when file info is found)
      await updateRecordingStatus(recordingId, 'recording');

      return NextResponse.json({
        success: true,
        message: 'Recording stopped successfully. File processing in background.'
      });
    }

  } catch (error: unknown) {
    console.error('Error stopping recording:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to stop recording',
      details: errorMessage
    }, { status: 500 });
  }
} 