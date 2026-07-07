import { revalidateTag, revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const secret = request.headers.get('x-revalidate-secret');

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  revalidateTag('app-data');
  revalidatePath('/');
  return NextResponse.json({ revalidated: true, timestamp: new Date().toISOString() });
}
