// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';
import { loginSchema } from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = validate(loginSchema, { body: rawBody }).body;
  const { email, password } = body;
  const { user, token } = await authService.login(email, password);
  return NextResponse.json({ status: 'success', data: { user, token } }, { status: 200 });
}, { rateLimit: { name: 'auth-login', limit: 10, windowSeconds: 900 } });
