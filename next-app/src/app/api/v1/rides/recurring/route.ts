// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-wrapper';
import { spawnRecurringRides } from '@/modules/rides/ride.service';

/**
 * GET /api/v1/rides/recurring
 *
 * Daily CRON endpoint — spawns one ride instance per active recurring template
 * whose weeklyDays includes today's day-of-week, skipping days where a child
 * ride already exists.
 *
 * Security: requires the request to carry the Authorization header with the
 * value "Bearer <CRON_SECRET>" (env var).  For local dev, any request is
 * accepted when CRON_SECRET is not set.
 *
 * Example Vercel cron.json:
 *   { "crons": [{ "path": "/api/v1/rides/recurring", "schedule": "0 0 * * *" }] }
 */
export const GET = apiHandler(async (req) => {
  // Validate CRON secret
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== secret) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await spawnRecurringRides();

  return NextResponse.json(
    {
      status: 'success',
      message: `Spawned ${result.spawned} recurring ride(s) for today.`,
      data: result,
    },
    { status: 200 }
  );
});
