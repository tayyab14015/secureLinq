import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByPhone } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const phoneNumber = searchParams.get('phone');

    // Validate that at least one parameter is provided
    if (!userId && !phoneNumber) {
      return NextResponse.json({ 
        error: 'Either user ID or phone number is required' 
      }, { status: 400 });
    }

    let user;

    // Get user by ID if provided
    if (userId) {
      const id = parseInt(userId);
      if (isNaN(id)) {
        return NextResponse.json({ 
          error: 'Invalid user ID format' 
        }, { status: 400 });
      }
      user = await getUserById(id);
    }
    // Get user by phone number if ID not provided
    else if (phoneNumber) {
      user = await getUserByPhone(phoneNumber);
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: {
        ID: user.ID,
        name: user.name,
        phoneNumber: user.phoneNumber
      }
    });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 