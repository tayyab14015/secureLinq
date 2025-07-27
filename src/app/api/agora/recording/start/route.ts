import { NextRequest, NextResponse } from 'next/server';
import { AgoraRecordingService } from '../../../../../../lib/agoraRecordingService';
import { 
  getMeetingRoomByRoomId, 
  createRecording,
  getLoadById 
} from '../../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { roomId, channelName, uid, token } = await request.json();

    if (!roomId || !channelName || !uid || !token) {
      return NextResponse.json({ 
        error: 'roomId, channelName, uid, and token are required' 
      }, { status: 400 });
    }

    // Get meeting room details
    const meetingRoom = await getMeetingRoomByRoomId(roomId);
    if (!meetingRoom) {
      return NextResponse.json({ 
        error: 'Meeting room not found' 
      }, { status: 404 });
    }

    // Get load details for S3 path
    const load = await getLoadById(meetingRoom.loadId);
    if (!load) {
      return NextResponse.json({ 
        error: 'Load not found' 
      }, { status: 404 });
    }

    // Start recording using Agora service
    const recordingResponse = await AgoraRecordingService.startRecording(
      channelName,
      uid,
      token,
      load.loadNumber // Pass loadNumber for S3 path
    );

    if (!recordingResponse.success) {
      return NextResponse.json({ 
        error: recordingResponse || 'Failed to start recording' 
      }, { status: 500 });
    }
console.log('recordingResponse',recordingResponse)
console.log ('meetingRoom',meetingRoom.ID)
    // Save recording details to database
    await createRecording(
      meetingRoom.ID,
      recordingResponse.resourceId!,
      recordingResponse.sid!,
      recordingResponse.recordingId!,
      recordingResponse.uid,
      recordingResponse.cname

    );

    return NextResponse.json({
      success: true,
      recordingId: recordingResponse.recordingId,
      resourceId: recordingResponse.resourceId,
      sid: recordingResponse.sid,
      message: 'Recording started successfully'
    });

  } catch (error) {
    console.error('Error starting recording:', error);
    return NextResponse.json({ 
      error: 'Failed to start recording' 
    }, { status: 500 });
  }
} 