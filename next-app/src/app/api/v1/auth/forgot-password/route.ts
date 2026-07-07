// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';
import { forgotPasswordSchema } from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = validate(forgotPasswordSchema, { body: rawBody }).body;
  const { email } = body;
  const result = await authService.forgotPassword(email);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
}, { rateLimit: { name: 'auth-forgot-password', limit: 5, windowSeconds: 900 } });
