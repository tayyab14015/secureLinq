import { NextResponse } from 'next/server';
import { getAllUsers } from '../../../../../lib/db';

export async function GET() {
  try {
    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      users: users.map(user => ({
        ID: user.ID,
        name: user.name,
        phoneNumber: user.phoneNumber
      })),
      count: users.length
    });

  } catch (error) {
    console.error('Error fetching users list:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 