import { NextRequest, NextResponse } from 'next/server';
import { S3Service } from '../../../../lib/s3Service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loadNumber = searchParams.get('loadNumber');

    if (!loadNumber) {
      return NextResponse.json({ 
        error: 'loadNumber parameter is required' 
      }, { status: 400 });
    }

    // Fetch media directly from S3
    const s3Result = await S3Service.listLoadMedia(loadNumber);
    
    if (!s3Result.success) {
      console.error('Failed to load media from S3:', s3Result.error);
      return NextResponse.json({ 
        error: 'Failed to fetch media from S3',
        details: s3Result.error 
      }, { status: 500 });
    }

    // Sort by step, then by timestamp
    const sortedMedia = (s3Result.media || []).sort((a, b) => {
      if (a.step !== b.step) {
        return (a.step || 0) - (b.step || 0);
      }
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    });

    // Transform S3 media objects to match expected format
    const transformedMedia = S3Service.transformMediaForFrontend(sortedMedia);

    return NextResponse.json(transformedMedia);

  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch media',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 