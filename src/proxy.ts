import { NextResponse, type NextRequest } from 'next/server';

// admin.tapaway.today serves the admin portal at every path (it navigates by
// URL hash), so rewrite its page requests to /admin. Everything else passes.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  if (!host.startsWith('admin.')) return NextResponse.next();
  if (request.nextUrl.pathname === '/admin') return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = '/admin';
  return NextResponse.rewrite(url);
}

export const config = {
  // Page requests only: not the API, Next's own assets, or files in public/.
  matcher: ['/((?!api/|_next/|.*\\.[\\w]+$).*)'],
};
