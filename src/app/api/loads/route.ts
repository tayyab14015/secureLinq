import { NextRequest, NextResponse } from 'next/server';
import { getAllLoads, createLoad, getUserById, getLoadByLoadNumber, getLoadById, updateLoadStatus } from '../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loadNumber = searchParams.get('loadNumber');
    const id = searchParams.get('id');

    // If id is provided, fetch load by ID
    if (id) {
      const loadId = parseInt(id);
      if (isNaN(loadId)) {
        return NextResponse.json({ error: 'Invalid load ID' }, { status: 400 });
      }
      
      const load = await getLoadById(loadId);
      if (!load) {
        return NextResponse.json({ error: 'Load not found' }, { status: 404 });
      }
      return NextResponse.json(load);
    }

    // If loadNumber is provided, fetch specific load by loadNumber
    if (loadNumber) {
      const load = await getLoadByLoadNumber(loadNumber);
      if (!load) {
        return NextResponse.json({ error: 'Load not found' }, { status: 404 });
      }
      return NextResponse.json(load);
    }

    // Otherwise, fetch all loads
    const loads = await getAllLoads();
    return NextResponse.json(loads);
  } catch (error) {
    console.error('Error fetching loads:', error);
    return NextResponse.json({ error: 'Failed to fetch loads' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, loadNumber } = await request.json();

    // Validate required fields
    if (!userId || !loadNumber) {
      return NextResponse.json({ error: 'userId and loadNumber are required' }, { status: 400 });
    }

    // Verify user exists
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const loadId = await createLoad(userId, loadNumber);
    return NextResponse.json({ 
      success: true, 
      loadId : typeof loadId === 'bigint' ? Number(loadId) : loadId,
      message: 'Load created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating load:', error);
    return NextResponse.json({ error: 'Failed to create load' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Load ID is required' }, { status: 400 });
    }
    
    const loadId = parseInt(id);
    if (isNaN(loadId)) {
      return NextResponse.json({ error: 'Invalid load ID' }, { status: 400 });
    }

    const { status } = await request.json();
    
    if (typeof status !== 'boolean') {
      return NextResponse.json({ error: 'Status must be a boolean value' }, { status: 400 });
    }

    const updated = await updateLoadStatus(loadId, status);
    
    if (!updated) {
      return NextResponse.json({ error: 'Load not found or failed to update' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Load status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating load status:', error);
    return NextResponse.json({ error: 'Failed to update load status' }, { status: 500 });
  }
} 