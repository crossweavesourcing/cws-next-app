import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set('test_cookie', 'hello', { path: '/' });
  return NextResponse.redirect(new URL('/dashboard/login', request.url), 303);
}
