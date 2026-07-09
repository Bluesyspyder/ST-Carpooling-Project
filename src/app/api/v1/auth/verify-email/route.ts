// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, ApiError } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';

export const POST = apiHandler(async (req) => {
  const body = await parseBody(req);
  const { token } = body;

  if (!token) {
    throw new ApiError(400, 'Verification token is required.');
  }

  const result = await authService.verifyEmail(token);

  return NextResponse.json({ status: 'success', message: result.message }, { status: 200 });
}, { rateLimit: { name: 'auth-verify-email', limit: 20, windowSeconds: 60 } });
