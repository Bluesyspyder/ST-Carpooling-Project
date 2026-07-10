// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import { expirePendingBookings } from '@/modules/bookings/booking.service';

/**
 * GET /api/v1/bookings/expire
 *
 * Periodic CRON endpoint — flips unanswered 'pending'/'waitlisted' bookings
 * past their `expiresAt` to 'expired'.
 *
 * Security: requires the request to carry the Authorization header with the
 * value "Bearer <CRON_SECRET>" (env var). For local dev, any request is
 * accepted when CRON_SECRET is not set.
 *
 * Example Vercel cron.json (run every 5 minutes):
 *   { "crons": [{ "path": "/api/v1/bookings/expire", "schedule": "every 5 min" }] }
 */
export const GET = apiHandler(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== secret) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await expirePendingBookings();

  return NextResponse.json(
    {
      status: 'success',
      message: `Expired ${result.expired} booking request(s).`,
      data: result,
    },
    { status: 200 }
  );
});
