import { NextResponse } from 'next/server';

export async function POST() {

  // Clear the auth_token cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
