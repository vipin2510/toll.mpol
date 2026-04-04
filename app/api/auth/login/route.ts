import { NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { id, password } = await request.json();

    if (id === '1234567890' && password === '1234567890') {
      const token = await signToken(id);

      const response = NextResponse.json(
        { success: true, message: 'Logged in successfully' },
        { status: 200 }
      );

      // Set cookie directly on the response — NOT via cookieStore
      response.cookies.set('auth_token', token, {
        httpOnly: true,
        secure: false,  // flip to true when you add HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid ID or password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}