// @ts-nocheck
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { apiHandler, parseBody, validate } from '@/lib/api-wrapper';
import * as authService from '@/modules/auth/auth.service';

export const POST = apiHandler(async (req) => {
  const rawBody = await parseBody(req);
  const body = rawBody;
  const { email } = body;
  const result = await authService.resendVerification(email);
  return NextResponse.json({ status: 'success', data: result }, { status: 200 });
});
