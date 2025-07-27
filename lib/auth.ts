import { NextRequest, NextResponse } from 'next/server';

// Hardcoded admin credentials - change these for production
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'secure123'
};

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export function setAuthCookie(response: NextResponse): void {
  response.cookies.set('admin_session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/'
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.delete('admin_session');
}

export function isAuthenticated(request: NextRequest): boolean {
  const session = request.cookies.get('admin_session');
  return session?.value === 'authenticated';
}

export function requireAuth(request: NextRequest): NextResponse | null {
  if (!isAuthenticated(request)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return null;
} 