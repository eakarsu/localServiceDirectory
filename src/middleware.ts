import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), interest-cohort=()'
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const { success, remaining } = rateLimit(ip);

    response.headers.set('X-RateLimit-Limit', '100');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
