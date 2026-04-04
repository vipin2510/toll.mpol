import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-1234567890');

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const url = request.nextUrl;

  const isSigninPage = url.pathname === '/signin';
  const isDashboardOrRoot = url.pathname.startsWith('/dashboard') || url.pathname === '/';

  let isAuthenticated = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from signin page
  if (isSigninPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users to signin
  if (isDashboardOrRoot && !isAuthenticated) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Authenticated users at root -> dashboard
  if (url.pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

// Add default export as well to satisfy all possible Next.js 16 requirements
export default proxy;

export const config = {
  matcher: ['/', '/dashboard/:path*', '/signin'],
};
