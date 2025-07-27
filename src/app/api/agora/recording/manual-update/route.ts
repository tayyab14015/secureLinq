import { NextRequest, NextResponse } from 'next/server';
import { 
  getRecordingByRecordingId,
  updateRecordingFile,
  updateRecordingStatus
} from '../../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { recordingId, fileName, s3Key, s3Url, duration, fileSize } = await request.json();

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

    // If no filename provided, construct it from the stop response format we saw
    const finalFileName = fileName || `${recordingId}_${recording.cname}_0.mp4`;
    const finalS3Key = s3Key || finalFileName;
    const finalS3Url = s3Url || `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalFileName}`;

    // Update recording with file details
    await updateRecordingFile(
      recordingId,
      finalFileName,
      finalS3Key,
      finalS3Url,
      duration || 0,
      fileSize || 0
    );

    // Update status to completed
    await updateRecordingStatus(recordingId, 'completed');

    console.log(`Manually updated recording ${recordingId} with file info`);

    return NextResponse.json({
      success: true,
      fileName: finalFileName,
      s3Key: finalS3Key,
      s3Url: finalS3Url,
      duration: duration || 0,
      fileSize: fileSize || 0,
      message: 'Recording file information updated successfully'
    });

  } catch (error) {
    console.error('Error manually updating recording:', error);
    return NextResponse.json({ 
      error: 'Failed to update recording' 
    }, { status: 500 });
  }
} 