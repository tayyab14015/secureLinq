import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByPhone } from '../../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, phoneNumber } = await request.json();

    // Validate required fields
    if (!name || !phoneNumber) {
      return NextResponse.json({ 
        error: 'Name and phone number are required' 
      }, { status: 400 });
    }

    // Validate name (should not be empty or just whitespace)
    if (name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Name cannot be empty' 
      }, { status: 400 });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return NextResponse.json({ 
        error: 'Invalid phone number format' 
      }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanPhone = phoneNumber.trim();

    // Check if user with this phone number already exists
    const existingUser = await getUserByPhone(cleanPhone);
    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'User already registered',
        user: {
          ID: existingUser.ID,
          name: existingUser.name,
          phoneNumber: existingUser.phoneNumber
        }
      }, { status: 200 });
    }

    // Create new user
    const userId = await createUser(cleanName, cleanPhone);
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        ID: userId,
        name: cleanName,
        phoneNumber: cleanPhone
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error during user signup:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 