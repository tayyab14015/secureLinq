import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, setAuthCookie } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (validateAdminCredentials(username, password)) {
      const response = NextResponse.json({ 
        success: true, 
        message: 'Login successful' 
      });
      setAuthCookie(response);
      return response;
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
} 