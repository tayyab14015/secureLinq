import { NextRequest, NextResponse } from 'next/server';
import { AgoraRecordingService } from '../../../../../../lib/agoraRecordingService';

export async function POST(request: NextRequest) {
  try {
    const { resourceId, sid } = await request.json();

    if (!resourceId || !sid) {
      return NextResponse.json({ 
        error: 'resourceId and sid are required' 
      }, { status: 400 });
    }

    // Query recording status from Agora
    const queryResult = await AgoraRecordingService.queryRecording(resourceId, sid);
    
    // Get file info if available
    let fileInfo = null;
    try {
      fileInfo = await AgoraRecordingService.getRecordingFileInfo(resourceId, sid, 1, 0);
    } catch (error) {
      console.log('File info not yet available:', error instanceof Error ? error.message : String(error));
    }

    return NextResponse.json({
      success: true,
      queryResult,
      fileInfo,
      message: 'Recording status queried successfully'
    });

  } catch (error) {
    console.error('Error querying recording:', error);
    return NextResponse.json({ 
      error: 'Failed to query recording status' 
    }, { status: 500 });
  }
} 