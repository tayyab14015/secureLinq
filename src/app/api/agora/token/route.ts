import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

// Agora credentials - move these to environment variables
const APP_ID = process.env.AGORA_APP_ID || '';
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';

export async function POST(request: NextRequest) {
  try {
    const { channelName, uid, role = 'publisher' } = await request.json();

    if (!channelName || uid === undefined) {
      return NextResponse.json({ 
        error: 'channelName and uid are required' 
      }, { status: 400 });
    }

    if (!APP_ID || !APP_CERTIFICATE) {
      return NextResponse.json({ 
        error: 'Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.' 
      }, { status: 500 });
    }

    // Set token expiration time (24 hours from now)
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + 86400;

    // Determine role
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      expirationTimeInSeconds
    );

    return NextResponse.json({
      token,
      appId: APP_ID,
      channelName,
      uid,
      expirationTime: expirationTimeInSeconds
    });

  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json({ 
      error: 'Failed to generate token' 
    }, { status: 500 });
  }
} 