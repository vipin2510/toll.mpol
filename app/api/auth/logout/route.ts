import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();

  // Clear the auth_token cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
