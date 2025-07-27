import { NextRequest, NextResponse } from 'next/server';
import { 
  getRecordingsByMeetingRoomId,
  getMeetingRoomByLoadId
} from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loadId = searchParams.get('loadId');

    if (!loadId) {
      return NextResponse.json({ 
        error: 'loadId is required' 
      }, { status: 400 });
    }

    // Get meeting room for this load
    const meetingRoom = await getMeetingRoomByLoadId(parseInt(loadId));
    if (!meetingRoom) {
      return NextResponse.json({ 
        error: 'Meeting room not found for this load' 
      }, { status: 404 });
    }

    // Get all recordings for this meeting room
    const recordings = await getRecordingsByMeetingRoomId(meetingRoom.ID);

    return NextResponse.json({
      success: true,
      recordings,
      meetingRoom
    });

  } catch (error) {
    console.error('Error getting recordings:', error);
    return NextResponse.json({ 
      error: 'Failed to get recordings' 
    }, { status: 500 });
  }
} 