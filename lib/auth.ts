import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, TOKEN_EXPIRATION, COOKIE_OPTIONS } from './constants';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-1234567890'
);

// 🔐 Create JWT
export async function signToken(userId: string) {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRATION)
    .sign(JWT_SECRET);
}

// ✅ Verify JWT
export async function verifyToken(token: string | undefined) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

// 📦 Create Session (NEW)
export async function createSession(userId: string) {
  const token = await signToken(userId);

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    ...COOKIE_OPTIONS,
    expires: expiresAt,
    maxAge: 60 * 60,
  });

  return token;
}

// 🔍 Get Session
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  return await verifyToken(token);
}

// ❌ Delete Session (NEW)
export async function deleteSession() {
  const cookieStore = await cookies();

  cookieStore.delete({
    name: AUTH_COOKIE_NAME,
    path: '/', // important for proper deletion
  });
}
