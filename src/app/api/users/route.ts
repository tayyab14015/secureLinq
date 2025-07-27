import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { isAuthenticated } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await query('SELECT ID, name, phoneNumber FROM users ORDER BY name');
    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
} 