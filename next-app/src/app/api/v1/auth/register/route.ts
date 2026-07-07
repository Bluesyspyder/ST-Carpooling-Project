// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';
import { registerSchema } from '@/modules/auth/auth.validation';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = validate(registerSchema, { body: rawBody }).body;
  const { user, token } = await authService.register(body);
  return NextResponse.json({ status: 'success', data: { user, token } }, { status: 201 });
}, { rateLimit: { name: 'auth-register', limit: 5, windowSeconds: 3600 } });
