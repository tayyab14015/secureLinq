import { NextRequest, NextResponse } from 'next/server';
import { 
  createMeetingRoom, 
  getMeetingRoomByLoadId,
  getMeetingRoomByRoomId,
  updateMeetingRoomLastJoined,
  endMeetingRoom,
  getLoadById 
} from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

// Get or create meeting room for a load
export async function POST(request: NextRequest) {
  try {
    const { loadId } = await request.json();

    if (!loadId) {
      return NextResponse.json({ error: 'loadId is required' }, { status: 400 });
    }

    // Check if load exists
    const load = await getLoadById(loadId);
    if (!load) {
      return NextResponse.json({ error: 'Load not found' }, { status: 404 });
    }

    // Check if meeting room already exists for this load
    let meetingRoom = await getMeetingRoomByLoadId(loadId);
    
    if (!meetingRoom) {
      // Create new meeting room
      const roomId = uuidv4().replace(/-/g, '').substring(0, 12); // Short UUID
      const channelName = `meeting_${roomId}`;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL //|| 'http://localhost:3000';
      const meetingLink = `${baseUrl}/join/${roomId}`;

      await createMeetingRoom(loadId, roomId, channelName, meetingLink);
      
      // Get the created meeting room
      meetingRoom = await getMeetingRoomByLoadId(loadId);
    }

    return NextResponse.json({
      success: true,
      meetingRoom,
      message: 'Meeting room ready'
    });

  } catch (error) {
    console.error('Error creating/getting meeting room:', error);
    return NextResponse.json({ 
      error: 'Failed to create meeting room' 
    }, { status: 500 });
  }
}

// Get meeting room by room ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const meetingRoom = await getMeetingRoomByRoomId(roomId);
    
    if (!meetingRoom) {
      return NextResponse.json({ error: 'Meeting room not found' }, { status: 404 });
    }

    // Update last joined timestamp
    await updateMeetingRoomLastJoined(roomId);

    return NextResponse.json({
      success: true,
      meetingRoom
    });

  } catch (error) {
    console.error('Error getting meeting room:', error);
    return NextResponse.json({ 
      error: 'Failed to get meeting room' 
    }, { status: 500 });
  }
}

// End meeting room
export async function DELETE(request: NextRequest) {
  try {
    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const success = await endMeetingRoom(roomId);
    
    if (!success) {
      return NextResponse.json({ error: 'Meeting room not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting room ended'
    });

  } catch (error) {
    console.error('Error ending meeting room:', error);
    return NextResponse.json({ 
      error: 'Failed to end meeting room' 
    }, { status: 500 });
  }
} 