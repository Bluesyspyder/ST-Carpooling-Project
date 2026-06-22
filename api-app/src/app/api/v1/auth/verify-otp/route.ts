// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';
import { verifyOtpSchema } from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = validate(verifyOtpSchema, { body: rawBody }).body;
  const { email, otp } = body;
  const result = await authService.verifyOtp(email, otp);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
});
