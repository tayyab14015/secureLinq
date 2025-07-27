import { NextResponse } from 'next/server';
import { query } from '../../../../../../lib/db';

interface Recording {
  ID: number;
  recordingId: string;
  fileName: string;
  s3Key: string;
  status: string;
  meetingRoomId: number;
  startedAt: string;
  completedAt: string;
}

export async function GET() {
  try {
    const recordings = await query(
      'SELECT * FROM recordings ORDER BY created_at DESC LIMIT 20'
    ) as Recording[];

    return NextResponse.json({
      success: true,
      count: recordings.length,
      recordings: recordings.map((r: Recording) => ({
        id: r.ID,
        recordingId: r.recordingId,
        fileName: r.fileName,
        s3Key: r.s3Key,
        status: r.status,
        meetingRoomId: r.meetingRoomId,
        startedAt: r.startedAt,
        completedAt: r.completedAt
      }))
    });

  } catch (error: unknown) {
    console.error('Error fetching all recordings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch recordings',
      details: errorMessage
    }, { status: 500 });
  }
} 