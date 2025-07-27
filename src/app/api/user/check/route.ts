import { NextRequest, NextResponse } from 'next/server';
import { getUserByPhone } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone');

    if (!phoneNumber) {
      return NextResponse.json({ 
        error: 'Phone number is required' 
      }, { status: 400 });
    }

    const user = await getUserByPhone(phoneNumber);

    return NextResponse.json({
      success: true,
      exists: !!user,
      user: user ? {
        ID: user.ID,
        name: user.name,
        phoneNumber: user.phoneNumber
      } : null
    });

  } catch (error) {
    console.error('Error checking user existence:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 