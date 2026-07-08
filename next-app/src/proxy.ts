import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── CORS origin whitelist ──────────────────────────────────────────────────────
// Wildcards are not safe for a user-data app. Only allow:
//   1. The production Vercel deployment (derived from NEXT_PUBLIC_PROD_API_URL)
//   2. The Capacitor native app (uses a fixed synthetic origin)
//   3. Localhost for development
const buildAllowedOrigins = (): string[] => {
  const origins: string[] = [
    'capacitor://localhost',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ];

  // Derive the production origin from NEXT_PUBLIC_PROD_API_URL:
  // "https://myapp.vercel.app/api/v1" → "https://myapp.vercel.app"
  const prodUrl = process.env.NEXT_PUBLIC_PROD_API_URL;
  if (prodUrl) {
    try {
      const { origin } = new URL(prodUrl);
      if (!origins.includes(origin)) origins.push(origin);
    } catch {
      // Malformed URL — skip
    }
  }

  // Allow explicit extra origins from env (comma-separated)
  const extra = process.env.CORS_EXTRA_ORIGINS;
  if (extra) {
    extra.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => {
      if (!origins.includes(o)) origins.push(o);
    });
  }

  return origins;
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

const CORS_BASE_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers':
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-cron-secret',
};

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Always apply base headers. Only echo back a specific Allow-Origin if the
  // request origin is in the whitelist — this tells the browser it is allowed.
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return {
      ...CORS_BASE_HEADERS,
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    };
  }
  // Unknown origin: return no Allow-Origin header. Browser will block CORS.
  // Preflight will get a 403 below.
  return { ...CORS_BASE_HEADERS, 'Vary': 'Origin' };
}

export function middleware(req: NextRequest) {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    // If origin is unknown, respond 403 to kill the preflight.
    const status = origin && ALLOWED_ORIGINS.includes(origin) ? 204 : 403;
    return new NextResponse(null, { status, headers: corsHeaders });
  }

  const res = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => res.headers.set(key, value));
  return res;
}

export const config = {
  matcher: '/api/:path*',
};


