import { NextResponse } from 'next/server';
import { clearAuthCookie } from '../../../../../lib/auth';

export async function POST() {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logout successful' 
    });
    clearAuthCookie(response);
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
} 