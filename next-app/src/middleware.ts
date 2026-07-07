import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// CORS for the API. The packaged Android/iOS app calls this API from a
// different origin (capacitor://localhost / https://localhost), so the
// browser/WebView enforces CORS on every request. The web app never hits
// this because it calls the API same-origin. This runs on every request
// (including on Vercel serverless, unlike the custom server.js CORS setup,
// which only applies when the app is run via `node server.js`).
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
};

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const res = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.headers.set(key, value));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};
