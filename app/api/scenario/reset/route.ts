import { NextResponse } from 'next/server';
import { db } from '../../../../lib/store/mock-db';

export async function POST() {
  try {
    db.reset();
    return NextResponse.json({ success: true, message: 'Database reset to initial mock state.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
