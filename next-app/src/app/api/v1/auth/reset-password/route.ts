// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';
import { resetPasswordSchema } from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = validate(resetPasswordSchema, { body: rawBody }).body;
  const { email, otp, newPassword } = body;
  const result = await authService.resetPassword(email, otp, newPassword);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { rateLimit: { name: 'auth-reset-password', limit: 5, windowSeconds: 900 } });
